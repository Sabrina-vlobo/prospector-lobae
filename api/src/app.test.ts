import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Trocamos o Prisma de verdade por um dublê: os testes de rota checam
// o contrato HTTP (status, formato do JSON) sem depender do Postgres.
vi.mock("./lib/prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    lead: { groupBy: vi.fn() },
  },
}));

import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /health", () => {
  it("responde 200 quando o banco está de pé", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }] as never);

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "up" });
  });

  it("responde 503 quando o banco não responde", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("connection refused"));

    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body.db).toBe("down");
  });
});

describe("GET /leads/stats", () => {
  it("devolve o total e a contagem dos 6 status", async () => {
    vi.mocked(prisma.lead.groupBy).mockResolvedValue([
      { status: "NOVO", _count: { _all: 3 } },
      { status: "ENVIADO", _count: { _all: 1 } },
    ] as never);

    const res = await request(app).get("/leads/stats");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 4,
      byStatus: { NOVO: 3, ENVIADO: 1, RESPONDEU: 0, REUNIAO: 0, FECHOU: 0, DESCARTADO: 0 },
    });
  });

  it("responde 500 com mensagem genérica se o banco falhar", async () => {
    vi.mocked(prisma.lead.groupBy).mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).get("/leads/stats");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Erro interno" });
  });
});

describe("rota inexistente", () => {
  it("responde 404 em JSON", async () => {
    const res = await request(app).get("/nao-existe");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
