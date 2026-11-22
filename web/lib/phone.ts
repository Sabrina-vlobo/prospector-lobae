// Telefones do Google chegam em vários formatos: "(11) 91234-5678", "11 3456-7890",
// "+55 11 91234-5678", "011 91234-5678"... O wa.me exige só dígitos, com país:
// https://wa.me/5511912345678

/**
 * Normaliza um telefone brasileiro para o formato do WhatsApp (55 + DDD + número).
 * Devolve null se não der pra confiar no número (aí o botão fica desativado).
 */
export function normalizeBrazilPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");

  // "0 11 91234-5678" (com zero de longa distância) → tira os zeros da frente
  digits = digits.replace(/^0+/, "");

  // já veio com o 55 do Brasil?
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  // agora tem que sobrar DDD (2 dígitos) + número (8 fixo ou 9 celular)
  if (digits.length !== 10 && digits.length !== 11) return null;

  const ddd = Number(digits.slice(0, 2));
  // DDDs brasileiros vão de 11 a 99 e nenhum termina em 0
  if (ddd < 11 || ddd % 10 === 0) return null;

  const number = digits.slice(2);
  // celular (9 dígitos) sempre começa com 9; fixo (8 dígitos) começa com 2, 3, 4 ou 5.
  // 8 dígitos começando com 6–9 é celular antigo sem o 9 na frente: o WhatsApp não acharia.
  if (number.length === 9 && !number.startsWith("9")) return null;
  if (number.length === 8 && !/^[2-5]/.test(number)) return null;

  return `55${digits}`;
}

/** Link que abre o WhatsApp (app ou web) já com a mensagem escrita. Quem envia é você. */
export function whatsappLink(normalizedPhone: string, message: string): string {
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
