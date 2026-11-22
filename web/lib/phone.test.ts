import { describe, expect, it } from "vitest";
import { normalizeBrazilPhone, whatsappLink } from "./phone";

// Números inventados (formato válido, mas não são de ninguém de propósito).
describe("normalizeBrazilPhone", () => {
  it.each([
    ["(11) 91234-5678", "5511912345678"], // celular, formato do Google
    ["11 91234-5678", "5511912345678"],
    ["11912345678", "5511912345678"],
    ["+55 11 91234-5678", "5511912345678"], // já com o país
    ["55 (11) 91234-5678", "5511912345678"],
    ["011 91234-5678", "5511912345678"], // zero de longa distância
    ["(11) 3456-7890", "551134567890"], // fixo (WhatsApp Business funciona em fixo)
    ["(21) 99876-5432", "5521998765432"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeBrazilPhone(raw)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["(00) 90000-0001"], // DDD 00 não existe (é o formato dos leads fictícios)
    ["(10) 91234-5678"], // nenhum DDD termina em 0
    ["91234-5678"], // sem DDD
    ["(11) 81234-5678 12"], // dígitos demais
    ["(11) 8123-4567"], // celular antigo, sem o 9 na frente
    ["(11) 81234-5678"], // 9 dígitos começando com 8 não é celular válido
  ])("recusa %j", (raw) => {
    expect(normalizeBrazilPhone(raw)).toBeNull();
  });
});

describe("whatsappLink", () => {
  it("monta o wa.me com a mensagem codificada (acentos, quebras de linha, &)", () => {
    const link = whatsappLink("5511912345678", "Oi! Tudo bem?\nCafé & bolo");
    expect(link).toBe("https://wa.me/5511912345678?text=Oi!%20Tudo%20bem%3F%0ACaf%C3%A9%20%26%20bolo");
  });
});
