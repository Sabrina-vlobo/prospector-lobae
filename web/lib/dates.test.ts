import { describe, expect, it } from "vitest";
import { daysSince, followupLabel } from "./dates";

// Datas no fuso local (new Date(ano, mês-1, dia, hora)), igual ao navegador.
const now = new Date(2026, 10, 22, 10, 0); // 22/11/2026 10:00

describe("daysSince", () => {
  it("conta dias de calendário, não 24h", () => {
    expect(daysSince(new Date(2026, 10, 22, 8, 0).toISOString(), now)).toBe(0); // hoje cedo
    expect(daysSince(new Date(2026, 10, 21, 23, 0).toISOString(), now)).toBe(1); // ontem à noite
    expect(daysSince(new Date(2026, 10, 19, 12, 0).toISOString(), now)).toBe(3);
  });

  it("dá negativo para datas futuras", () => {
    expect(daysSince(new Date(2026, 10, 25, 9, 0).toISOString(), now)).toBe(-3);
  });
});

describe("followupLabel", () => {
  it.each([
    [new Date(2026, 10, 22, 18, 0), "hoje"],
    [new Date(2026, 10, 21, 9, 0), "atrasado há 1 dia"],
    [new Date(2026, 10, 18, 9, 0), "atrasado há 4 dias"],
  ])("%s → %s", (date, expected) => {
    expect(followupLabel(date.toISOString(), now)).toBe(expected);
  });
});
