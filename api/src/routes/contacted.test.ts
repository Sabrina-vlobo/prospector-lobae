import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma.js", () => ({
  prisma: { lead: { findUnique: vi.fn(), update: vi.fn() } },
}));

import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();
const NOW = new Date("2026-11-22T15:00:00.000Z");

beforeEach(() => {
  vi.resetAllMocks();
  // "Congela" o relógio: assim dá pra conferir as datas exatas.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(prisma.lead.findUnique).mockResolvedValue({ id: "lead-1" } as never);
  vi.mocked(prisma.lead.update).mockImplementation((async ({ data }: { data: object }) => ({
    id: "lead-1",
    ...data,
  })) as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /leads/:id/contacted", () => {
  it("marca ENVIADO, registra agora e agenda follow-up em 3 dias", async () => {
    const res = await request(app).post("/leads/lead-1/contacted").send({});

    expect(res.status).toBe(200);
    const { data } = vi.mocked(prisma.lead.update).mock.calls[0]![0];
    expect(data).toEqual({
      status: "ENVIADO",
      contactedAt: NOW,
      nextFollowupAt: new Date("2026-11-25T15:00:00.000Z"),
    });
  });

  it("salva a mensagem que foi enviada", async () => {
    await request(app).post("/leads/lead-1/contacted").send({ message: "  Oi! Tudo bem?  " });

    const { data } = vi.mocked(prisma.lead.update).mock.calls[0]![0];
    expect(data.message).toBe("Oi! Tudo bem?");
  });

  it("aceita chamada sem body", async () => {
    const res = await request(app).post("/leads/lead-1/contacted");
    expect(res.status).toBe(200);
  });

  it("recusa campos extras (ex: tentar mudar o status por aqui)", async () => {
    const res = await request(app).post("/leads/lead-1/contacted").send({ status: "FECHOU" });
    expect(res.status).toBe(400);
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it("responde 404 quando o lead não existe", async () => {
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(null as never);
    const res = await request(app).post("/leads/nao-existe/contacted").send({});
    expect(res.status).toBe(404);
  });
});
