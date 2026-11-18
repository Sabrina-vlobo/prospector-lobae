import { describe, expect, it } from "vitest";
import { classifyWebsite, hostOf } from "./website.js";

describe("classifyWebsite", () => {
  it.each([undefined, null, "", "   "])("sem URL (%j) → none", (url) => {
    expect(classifyWebsite(url)).toBe("none");
  });

  it.each([
    "https://instagram.com/barbearia.exemplo",
    "https://www.instagram.com/barbearia.exemplo/",
    "http://facebook.com/exemplo",
    "https://pt-br.facebook.com/exemplo",
    "https://m.facebook.com/exemplo",
    "https://linktr.ee/exemplo",
    "https://wa.me/5500900000000",
    "https://api.whatsapp.com/send?phone=5500900000000",
    "https://www.ifood.com.br/delivery/exemplo",
    "instagram.com/sem-protocolo",
  ])("%s → social", (url) => {
    expect(classifyWebsite(url)).toBe("social");
  });

  it.each([
    "https://example.com",
    "https://www.example.com.br/contato",
    "http://exemplo.negocio.br",
    "example.org",
  ])("%s → real", (url) => {
    expect(classifyWebsite(url)).toBe("real");
  });

  it("não confunde domínio parecido com rede social", () => {
    // termina com "x.com", mas não é o x.com
    expect(classifyWebsite("https://fox.com")).toBe("real");
    expect(classifyWebsite("https://meuinstagram.com.br")).toBe("real");
  });

  it("URL que não dá pra ler → none", () => {
    expect(classifyWebsite("http://")).toBe("none");
  });
});

describe("hostOf", () => {
  it("normaliza caixa e tira www", () => {
    expect(hostOf("HTTPS://WWW.Example.COM/a")).toBe("example.com");
  });
});
