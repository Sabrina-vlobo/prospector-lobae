import { describe, expect, it } from "vitest";
import { buildLeadStats } from "./stats.js";

describe("buildLeadStats", () => {
  it("devolve todos os status zerados quando não há leads", () => {
    expect(buildLeadStats([])).toEqual({
      total: 0,
      byStatus: { NOVO: 0, ENVIADO: 0, RESPONDEU: 0, REUNIAO: 0, FECHOU: 0, DESCARTADO: 0 },
    });
  });

  it("preenche os status que vieram do banco e soma o total", () => {
    const stats = buildLeadStats([
      { status: "NOVO", _count: { _all: 7 } },
      { status: "FECHOU", _count: { _all: 2 } },
    ]);

    expect(stats.total).toBe(9);
    expect(stats.byStatus.NOVO).toBe(7);
    expect(stats.byStatus.FECHOU).toBe(2);
    expect(stats.byStatus.ENVIADO).toBe(0);
  });
});
