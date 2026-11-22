import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    lead: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn(), groupBy: vi.fn() },
  },
}));

import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();
const fakeLead = { id: "lead-1", placeId: "demo-x", name: "Barbearia Exemplo", status: "NOVO" };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /leads", () => {
  it("devolve itens, total e paginação, repassando os filtros ao banco", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([fakeLead] as never);
    vi.mocked(prisma.lead.count).mockResolvedValue(31 as never);

    const res = await request(app).get("/leads?websiteType=none,social&minRating=4&page=2&pageSize=10");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [fakeLead], total: 31, page: 2, pageSize: 10 });

    const args = vi.mocked(prisma.lead.findMany).mock.calls[0]![0]!;
    expect(args.where).toEqual({ websiteType: { in: ["none", "social"] }, rating: { gte: 4 } });
    expect(args.skip).toBe(10); // página 2 com 10 por página pula os 10 primeiros
    expect(args.take).toBe(10);
  });

  it("responde 400 com filtro inválido", async () => {
    const res = await request(app).get("/leads?status=GANHOU");
    expect(res.status).toBe(400);
    expect(prisma.lead.findMany).not.toHaveBeenCalled();
  });

  it("/leads/stats continua funcionando (não é confundido com um id)", async () => {
    vi.mocked(prisma.lead.groupBy).mockResolvedValue([] as never);
    const res = await request(app).get("/leads/stats");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });
});

describe("GET /leads/followups/today", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("busca quem está ENVIADO com follow-up até o fim de hoje, mais atrasados primeiro", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 22, 9, 30)); // 22/11/2026 09:30 no fuso local
    vi.mocked(prisma.lead.findMany).mockResolvedValue([fakeLead] as never);

    const res = await request(app).get("/leads/followups/today");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [fakeLead], total: 1 });

    const args = vi.mocked(prisma.lead.findMany).mock.calls[0]![0]!;
    expect(args.where).toEqual({
      status: "ENVIADO",
      nextFollowupAt: { lte: new Date(2026, 10, 22, 23, 59, 59, 999) },
    });
    expect(args.orderBy).toEqual({ nextFollowupAt: "asc" });
  });
});

describe("GET /leads/:id", () => {
  it("devolve o lead", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(fakeLead as never);
    const res = await request(app).get("/leads/lead-1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeLead);
  });

  it("responde 404 quando não existe", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(null as never);
    const res = await request(app).get("/leads/nao-existe");
    expect(res.status).toBe(404);
  });

  it("não engole as rotas fixas (/followups/today continua sendo a lista)", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([] as never);
    const res = await request(app).get("/leads/followups/today");
    expect(res.body).toEqual({ items: [], total: 0 });
    expect(prisma.lead.findUnique).not.toHaveBeenCalled();
  });
});

describe("PATCH /leads/:id", () => {
  it("atualiza o status", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({ id: "lead-1" } as never);
    vi.mocked(prisma.lead.update).mockResolvedValue({ ...fakeLead, status: "DESCARTADO" } as never);

    const res = await request(app).patch("/leads/lead-1").send({ status: "DESCARTADO" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("DESCARTADO");
    // saiu de ENVIADO → o lembrete de follow-up é cancelado junto
    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { status: "DESCARTADO", nextFollowupAt: null },
    });
  });

  it("mantém o follow-up quando o status continua ENVIADO", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({ id: "lead-1" } as never);
    vi.mocked(prisma.lead.update).mockResolvedValue(fakeLead as never);

    await request(app).patch("/leads/lead-1").send({ status: "ENVIADO" });

    expect(vi.mocked(prisma.lead.update).mock.calls[0]![0].data).toEqual({ status: "ENVIADO" });
  });

  it("salvar só as notas não mexe em status nem follow-up", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({ id: "lead-1" } as never);
    vi.mocked(prisma.lead.update).mockResolvedValue(fakeLead as never);

    await request(app).patch("/leads/lead-1").send({ notes: "Ligar depois das 14h" });

    expect(vi.mocked(prisma.lead.update).mock.calls[0]![0].data).toEqual({ notes: "Ligar depois das 14h" });
  });

  it("recusa campos que não podem ser editados (ex: placeId)", async () => {
    const res = await request(app).patch("/leads/lead-1").send({ placeId: "outro" });
    expect(res.status).toBe(400);
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it("recusa body vazio", async () => {
    const res = await request(app).patch("/leads/lead-1").send({});
    expect(res.status).toBe(400);
  });

  it("responde 404 quando o lead não existe", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(null as never);

    const res = await request(app).patch("/leads/nao-existe").send({ status: "ENVIADO" });

    expect(res.status).toBe(404);
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });
});
