import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("PATCH /leads/:id", () => {
  it("atualiza o status", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue({ id: "lead-1" } as never);
    vi.mocked(prisma.lead.update).mockResolvedValue({ ...fakeLead, status: "DESCARTADO" } as never);

    const res = await request(app).patch("/leads/lead-1").send({ status: "DESCARTADO" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("DESCARTADO");
    expect(prisma.lead.update).toHaveBeenCalledWith({ where: { id: "lead-1" }, data: { status: "DESCARTADO" } });
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
