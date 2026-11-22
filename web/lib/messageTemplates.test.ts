import { describe, expect, it } from "vitest";
import {
  OPT_OUT_LINE,
  SIGNATURE,
  buildFollowupOptions,
  buildMessageOptions,
  socialNetworkName,
} from "./messageTemplates";

const base = {
  name: "Barbearia Exemplo",
  category: "barbearia",
  city: "Cidade Exemplo",
  rating: 4.8,
  reviewsCount: 212,
  websiteType: "none" as const,
  website: null,
  message: null,
};

describe("buildMessageOptions", () => {
  it("gera os 3 modelos, todos com o nome, assinatura e linha de saída", () => {
    const options = buildMessageOptions(base);

    expect(options.map((o) => o.id)).toEqual(["direta", "elogio", "curta"]);
    for (const option of options) {
      expect(option.text).toContain("Barbearia Exemplo");
      expect(option.text.endsWith(`${SIGNATURE}\n${OPT_OUT_LINE}`)).toBe(true);
    }
  });

  it("elogia com a nota no formato brasileiro", () => {
    const [direta] = buildMessageOptions(base);
    expect(direta!.text).toContain("nota 4,8 com 212 avaliações");
  });

  it("não cita nota baixa nem inexistente", () => {
    const [semNota] = buildMessageOptions({ ...base, rating: null });
    const [notaBaixa] = buildMessageOptions({ ...base, rating: 3.2 });
    expect(semNota!.text).not.toContain("nota");
    expect(notaBaixa!.text).not.toContain("3,2");
  });

  it("fala da rede social certa quando o negócio só tem Instagram", () => {
    const [direta] = buildMessageOptions({
      ...base,
      websiteType: "social",
      website: "https://instagram.com/barbearia.exemplo",
    });
    expect(direta!.text).toContain("hoje vocês estão só no Instagram");
  });

  it("diz que não tem site quando não tem nada", () => {
    const [direta] = buildMessageOptions(base);
    expect(direta!.text).toContain("vocês ainda não têm um site");
  });

  it("usa segmento e cidade no modelo de elogio", () => {
    const elogio = buildMessageOptions(base)[1]!;
    expect(elogio.text).toContain("procurando barbearia em Cidade Exemplo");
  });

  it("inclui a sugestão da IA como 4ª opção quando existe", () => {
    const options = buildMessageOptions({ ...base, message: "Mensagem que a IA escreveu" });
    expect(options).toHaveLength(4);
    expect(options[3]).toEqual({ id: "salva", label: "Sugestão da IA", text: "Mensagem que a IA escreveu" });
  });

  it("chama de 'Última enviada' a mensagem salva de quem já foi contatado", () => {
    const options = buildMessageOptions({
      ...base,
      message: "Oi! Mensagem que eu enviei",
      contactedAt: "2026-11-22T15:00:00.000Z",
    });
    expect(options[3]!.label).toBe("Última enviada");
  });
});

describe("regra: primeiro contato sem oferecer demo", () => {
  it.each([
    ["sem site", base],
    ["só Instagram", { ...base, websiteType: "social" as const, website: "https://instagram.com/x" }],
  ])("nenhum modelo oferece exemplo, demo ou ideia pronta (%s)", (_label, lead) => {
    for (const option of buildMessageOptions(lead)) {
      // tira o nome do negócio ("Barbearia Exemplo") antes de procurar as palavras proibidas
      const withoutName = option.text.replaceAll(lead.name, "");
      expect(withoutName).not.toMatch(/exemplo|demo|ideia de como|te mostrar|te mandar/i);
    }
  });

  it("todos terminam com uma pergunta antes da assinatura", () => {
    for (const option of buildMessageOptions(base)) {
      const body = option.text.split(`\n\n${SIGNATURE}`)[0]!;
      expect(body).toMatch(/\?/);
    }
  });
});

describe("buildFollowupOptions", () => {
  const followups = buildFollowupOptions(base);

  it("gera 3 sugestões com o nome do negócio e assinatura", () => {
    expect(followups.map((f) => f.id)).toEqual(["followup-leve", "followup-pergunta", "followup-final"]);
    for (const f of followups) {
      expect(f.text).toContain("Barbearia Exemplo");
      expect(f.text).toContain(SIGNATURE);
    }
  });

  it("só o 'Último contato' deixa de agendar novo follow-up", () => {
    expect(followups.map((f) => f.scheduleFollowup ?? true)).toEqual([true, true, false]);
  });

  it("os dois primeiros mantêm a linha de saída", () => {
    expect(followups[0]!.text.endsWith(OPT_OUT_LINE)).toBe(true);
    expect(followups[1]!.text.endsWith(OPT_OUT_LINE)).toBe(true);
  });
});

describe("socialNetworkName", () => {
  it.each([
    ["https://www.instagram.com/x", "Instagram"],
    ["https://pt-br.facebook.com/x", "Facebook"],
    ["https://linktr.ee/x", "Linktree"],
    ["https://wa.me/5500000000000", "WhatsApp"],
    ["https://example.com", null],
    [null, null],
  ])("%s → %s", (url, expected) => {
    expect(socialNetworkName(url)).toBe(expected);
  });
});
