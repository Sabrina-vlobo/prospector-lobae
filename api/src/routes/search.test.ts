import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Banco simulado: só os métodos que a busca usa.
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    lead: { findMany: vi.fn(), upsert: vi.fn() },
    apiUsage: { upsert: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
  },
}));

import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();
const fetchMock = vi.fn();

// Respostas falsas no formato do Google (dados inventados).
const placeA = { id: "pA", displayName: { text: "Barbearia A" }, rating: 4.8, userRatingCount: 120 };
const placeB = { id: "pB", displayName: { text: "Barbearia B" }, websiteUri: "https://instagram.com/b" };
const placeC = { id: "pC", displayName: { text: "Barbearia C" }, websiteUri: "https://example.com" };

function googleReplies(...bodies: unknown[]) {
  for (const body of bodies) {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 }));
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  // por padrão: tem cota, nada existe no banco, já usamos 2 chamadas no mês
  vi.mocked(prisma.apiUsage.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.apiUsage.findUnique).mockResolvedValue({ calls: 2 } as never);
  vi.mocked(prisma.lead.findMany).mockResolvedValue([] as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /search", () => {
  it("recusa com 400 quando falta a cidade", async () => {
    const res = await request(app).post("/search").send({ segment: "barbearia" });

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pagina com nextPageToken, não duplica e classifica o site", async () => {
    googleReplies(
      { places: [placeA, placeB], nextPageToken: "token-2" },
      { places: [placeB, placeC] }, // B repetido; sem token = acabou
    );
    vi.mocked(prisma.lead.findMany).mockResolvedValue([{ placeId: "pA" }] as never);

    const res = await request(app)
      .post("/search")
      .send({ segment: "barbearia", city: "Cidade Exemplo", pages: 3, skipRealSites: false });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      query: "barbearia em Cidade Exemplo",
      pagesFetched: 2,
      found: 3,
      created: 2,
      updated: 1,
      skipped: 0,
      byWebsiteType: { none: 1, social: 1, real: 1 },
      usage: { used: 2, limit: 200 },
    });

    // 2 chamadas ao Google; a 2ª manda o token da 1ª
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, firstInit] = fetchMock.mock.calls[0]!;
    expect(firstInit.headers["X-Goog-FieldMask"]).toContain("nextPageToken");
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).pageToken).toBe("token-2");

    // 1 upsert por lugar único
    expect(prisma.lead.upsert).toHaveBeenCalledTimes(3);
  });

  it("por padrão, não salva quem já tem site próprio (mas conta no resumo)", async () => {
    googleReplies({ places: [placeA, placeB, placeC] }); // A sem site, B Instagram, C site real

    const res = await request(app).post("/search").send({ segment: "barbearia", city: "Cidade Exemplo" });

    expect(res.body).toMatchObject({
      found: 3,
      created: 2,
      skipped: 1,
      byWebsiteType: { none: 1, social: 1, real: 1 },
    });
    const savedIds = vi.mocked(prisma.lead.upsert).mock.calls.map(([args]) => args.where.placeId);
    expect(savedIds).toEqual(["pA", "pB"]);
  });

  it("salva quem tem site quando skipRealSites é false", async () => {
    googleReplies({ places: [placeC] });

    const res = await request(app)
      .post("/search")
      .send({ segment: "barbearia", city: "Cidade Exemplo", skipRealSites: false });

    expect(res.body).toMatchObject({ created: 1, skipped: 0 });
    expect(prisma.lead.upsert).toHaveBeenCalledTimes(1);
  });

  it("nunca sobrescreve status ou notas numa busca repetida", async () => {
    googleReplies({ places: [placeA] });

    await request(app).post("/search").send({ segment: "barbearia", city: "Cidade Exemplo" });

    const args = vi.mocked(prisma.lead.upsert).mock.calls[0]![0];
    expect(args.update).not.toHaveProperty("status");
    expect(args.update).not.toHaveProperty("notes");
    expect(args.create).toMatchObject({ placeId: "pA", category: "barbearia", city: "Cidade Exemplo" });
  });

  it("respeita o número de páginas pedido, mesmo se o Google tiver mais", async () => {
    googleReplies({ places: [placeA], nextPageToken: "token-2" });

    const res = await request(app)
      .post("/search")
      .send({ segment: "barbearia", city: "Cidade Exemplo", pages: 1 });

    expect(res.body.pagesFetched).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("responde 429 e NÃO chama o Google quando a cota do mês acabou", async () => {
    vi.mocked(prisma.apiUsage.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app).post("/search").send({ segment: "barbearia", city: "Cidade Exemplo" });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe("QUOTA_EXCEEDED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("transforma erro do Google em 502 com mensagem legível", async () => {
    fetchMock.mockResolvedValueOnce(new Response("API key not valid", { status: 400 }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).post("/search").send({ segment: "barbearia", city: "Cidade Exemplo" });

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/Google recusou/);
    expect(prisma.lead.upsert).not.toHaveBeenCalled();
  });
});
