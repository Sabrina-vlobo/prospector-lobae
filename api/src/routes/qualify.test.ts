import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    lead: { findUnique: vi.fn(), update: vi.fn() },
    apiUsage: { upsert: vi.fn(), updateMany: vi.fn() },
  },
}));

// A IA fica simulada: nenhum teste chama (nem paga) o Claude de verdade.
vi.mock("../lib/claude.js", () => ({ askClaudeForQualification: vi.fn(), ensureClaudeConfigured: vi.fn() }));

import { createApp } from "../app.js";
import { askClaudeForQualification, ensureClaudeConfigured } from "../lib/claude.js";
import { HttpError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();
const fetchMock = vi.fn();

// Lead "real" (veio do Google) e lead de demo (seed) — dados inventados.
const realLead = {
  id: "lead-real",
  placeId: "ChIJ-exemplo",
  name: "Barbearia Exemplo",
  category: "barbearia",
  city: "Cidade Exemplo",
  websiteType: "social",
  website: "https://instagram.com/exemplo",
  rating: 4.8,
  reviewsCount: 120,
};
const demoLead = { ...realLead, id: "lead-demo", placeId: "demo-001" };

const goodAnswer = {
  score: 85,
  scoreReason: "Só tem Instagram e muitos clientes.",
  hook: "Clientes não acham o horário de funcionamento.",
  message: "Oi! Vi que a Barbearia Exemplo é super bem avaliada, mas o pessoal sempre pergunta o horário.",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(prisma.apiUsage.updateMany).mockResolvedValue({ count: 1 } as never); // cota livre
  vi.mocked(prisma.lead.update).mockImplementation((async ({ data }: { data: object }) => ({
    ...realLead,
    ...data,
  })) as never);
  vi.mocked(askClaudeForQualification).mockResolvedValue(goodAnswer);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function googleReviews(reviews: unknown[]) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ reviews }), { status: 200 }));
}

describe("POST /leads/:id/qualify", () => {
  it("busca avaliações, manda pra IA e salva nota, gancho e mensagem completa", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(realLead as never);
    googleReviews([
      {
        rating: 4,
        originalText: { text: "Corte ótimo, mas nunca sei se está aberto." },
        relativePublishTimeDescription: "há um mês",
        authorAttribution: { displayName: "Fulano de Tal" },
      },
    ]);

    const res = await request(app).post("/leads/lead-real/qualify");

    expect(res.status).toBe(200);

    // Google: pediu SÓ o campo reviews
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain("/places/ChIJ-exemplo");
    expect(init.headers["X-Goog-FieldMask"]).toBe("reviews");

    // IA: recebeu a avaliação, mas NÃO o nome de quem escreveu
    const prompt = vi.mocked(askClaudeForQualification).mock.calls[0]![0];
    expect(prompt).toContain("nunca sei se está aberto");
    expect(prompt).not.toContain("Fulano");

    // Banco: salvou o resultado, com assinatura e frase final garantidas
    const { data } = vi.mocked(prisma.lead.update).mock.calls[0]![0];
    expect(data).toMatchObject({ score: 85, hook: goodAnswer.hook });
    expect(data.message).toMatch(/Sabrina, da LOBAE\nQualquer coisa, é só me chamar por aqui\.$/);
  });

  it("não gasta chamada ao Google com lead de demo ou sem avaliações", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce(demoLead as never);
    await request(app).post("/leads/lead-demo/qualify").expect(200);

    vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({ ...realLead, reviewsCount: 0 } as never);
    await request(app).post("/leads/lead-real/qualify").expect(200);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(askClaudeForQualification).toHaveBeenCalledTimes(2);
  });

  it("recusa com 502 e NÃO salva quando a IA responde fora do formato", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(demoLead as never);
    vi.mocked(askClaudeForQualification).mockResolvedValue({ ...goodAnswer, score: 150 });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).post("/leads/lead-demo/qualify");

    expect(res.status).toBe(502);
    expect(res.body.code).toBe("AI_BAD_OUTPUT");
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it("sem chave da IA: responde 503 sem gastar cota nem chamar o Google", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(realLead as never);
    vi.mocked(ensureClaudeConfigured).mockImplementation(() => {
      throw new HttpError(503, "Falta a ANTHROPIC_API_KEY", "MISSING_ANTHROPIC_KEY");
    });

    const res = await request(app).post("/leads/lead-real/qualify");

    expect(res.status).toBe(503);
    expect(prisma.apiUsage.updateMany).not.toHaveBeenCalled(); // nenhuma cota reservada
    expect(fetchMock).not.toHaveBeenCalled();
    expect(askClaudeForQualification).not.toHaveBeenCalled();
  });

  it("responde 404 quando o lead não existe", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(null as never);

    const res = await request(app).post("/leads/nao-existe/qualify");

    expect(res.status).toBe(404);
    expect(askClaudeForQualification).not.toHaveBeenCalled();
  });

  it("responde 429 e NÃO chama a IA quando a cota do mês acabou", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(demoLead as never);
    vi.mocked(prisma.apiUsage.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app).post("/leads/lead-demo/qualify");

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/qualificações com IA/);
    expect(askClaudeForQualification).not.toHaveBeenCalled();
  });
});

describe("POST /leads/qualify (em lote)", () => {
  it("continua quando um falha e informa o resultado de cada um", async () => {
    vi.mocked(prisma.lead.findUnique).mockImplementation((async ({ where }: { where: { id: string } }) =>
      where.id === "sumiu" ? null : { ...demoLead, id: where.id }) as never);

    const res = await request(app)
      .post("/leads/qualify")
      .send({ ids: ["a", "sumiu", "b", "a"] }); // "a" repetido conta uma vez só

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ succeeded: 2, failed: 1 });
    expect(res.body.results.map((r: { id: string; ok: boolean }) => [r.id, r.ok])).toEqual([
      ["a", true],
      ["sumiu", false],
      ["b", true],
    ]);
  });

  it("para na hora quando a cota acaba (não tenta os próximos)", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(demoLead as never);
    vi.mocked(prisma.apiUsage.updateMany)
      .mockResolvedValueOnce({ count: 1 } as never)
      .mockResolvedValue({ count: 0 } as never);

    const res = await request(app).post("/leads/qualify").send({ ids: ["a", "b", "c"] });

    expect(res.body).toMatchObject({ succeeded: 1, failed: 2 });
    expect(askClaudeForQualification).toHaveBeenCalledTimes(1);
    expect(res.body.results[2].error).toMatch(/^Não processado/);
  });

  it("recusa mais leads do que o limite por lote", async () => {
    const ids = Array.from({ length: 11 }, (_, i) => `id-${i}`);
    const res = await request(app).post("/leads/qualify").send({ ids });

    expect(res.status).toBe(400);
    expect(askClaudeForQualification).not.toHaveBeenCalled();
  });
});
