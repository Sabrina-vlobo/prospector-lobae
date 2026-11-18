import { z } from "zod";
import { HttpError } from "./errors.js";

const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

// Field mask: SÓ os campos que o app usa. O Google cobra pela faixa do campo
// mais caro pedido, e sem essa lista ele nem aceita a chamada.
// `nextPageToken` também precisa estar aqui, senão a paginação não vem.
export const TEXT_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "nextPageToken",
].join(",");

// Não confiamos cegamente na resposta externa: o zod confere o formato.
// Campos que o negócio não preencheu simplesmente não vêm (por isso .optional()).
const PlaceSchema = z.object({
  id: z.string(),
  displayName: z.object({ text: z.string() }).optional(),
  formattedAddress: z.string().optional(),
  nationalPhoneNumber: z.string().optional(),
  websiteUri: z.string().optional(),
  rating: z.number().optional(),
  userRatingCount: z.number().int().optional(),
  googleMapsUri: z.string().optional(),
});

const TextSearchResponseSchema = z.object({
  // quando não acha nada, o Google devolve {} (sem "places")
  places: z.array(PlaceSchema).default([]),
  nextPageToken: z.string().optional(),
});

export type Place = z.infer<typeof PlaceSchema>;
export type TextSearchPage = z.infer<typeof TextSearchResponseSchema>;

/** Uma chamada = uma página (até 20 lugares). */
export async function searchTextPage(params: {
  apiKey: string;
  textQuery: string;
  pageToken?: string;
}): Promise<TextSearchPage> {
  const res = await fetch(TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": params.apiKey,
      "X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: params.textQuery,
      languageCode: "pt-BR",
      regionCode: "BR",
      pageSize: 20,
      ...(params.pageToken ? { pageToken: params.pageToken } : {}),
    }),
  });

  if (!res.ok) {
    // O Google explica o erro no corpo (chave inválida, API não ativada...).
    // Logamos no terminal da API e devolvemos uma mensagem curta pra tela.
    const detail = await res.text().catch(() => "");
    console.error(`[google places] ${res.status}: ${detail.slice(0, 500)}`);
    throw new HttpError(
      502,
      `O Google recusou a busca (HTTP ${res.status}). Confira a chave e se a "Places API (New)" está ativada no Google Cloud.`,
      "GOOGLE_ERROR",
    );
  }

  const parsed = TextSearchResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    console.error("[google places] resposta inesperada", parsed.error.issues);
    throw new HttpError(502, "O Google respondeu num formato inesperado.", "GOOGLE_BAD_RESPONSE");
  }
  return parsed.data;
}
