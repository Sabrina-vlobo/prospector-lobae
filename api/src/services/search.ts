import { env } from "../env.js";
import type { WebsiteType } from "../generated/prisma/enums.js";
import { HttpError } from "../lib/errors.js";
import { searchTextPage, type Place } from "../lib/googlePlaces.js";
import { prisma } from "../lib/prisma.js";
import { GOOGLE_PLACES, getUsage, reserveCall } from "../lib/quota.js";
import { classifyWebsite } from "../lib/website.js";

export type SearchInput = { segment: string; city: string; pages: number };

export type SearchSummary = {
  query: string;
  pagesFetched: number;
  found: number;
  created: number;
  updated: number;
  byWebsiteType: Record<WebsiteType, number>;
  usage: { used: number; limit: number; period: string };
};

export async function runSearch({ segment, city, pages }: SearchInput): Promise<SearchSummary> {
  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new HttpError(
      503,
      "Falta a GOOGLE_PLACES_API_KEY no api/.env. Coloque a chave e reinicie o npm run dev.",
      "MISSING_GOOGLE_KEY",
    );
  }

  const maxPages = Math.min(pages, env.GOOGLE_MAX_PAGES_PER_SEARCH);
  const textQuery = `${segment} em ${city}`;

  // 1) Busca no Google, página por página, reservando cota ANTES de cada chamada.
  const places = new Map<string, Place>(); // Map por id: se o Google repetir um lugar, fica um só
  let pageToken: string | undefined;
  let pagesFetched = 0;

  do {
    await reserveCall(GOOGLE_PLACES, env.GOOGLE_MONTHLY_CALL_LIMIT);
    const page = await searchTextPage({ apiKey, textQuery, pageToken });
    pagesFetched++;
    for (const place of page.places) places.set(place.id, place);
    pageToken = page.nextPageToken;
  } while (pageToken && pagesFetched < maxPages);

  // 2) Quais já existiam? (só pra contar "novos" x "atualizados")
  const ids = [...places.keys()];
  const existing = await prisma.lead.findMany({
    where: { placeId: { in: ids } },
    select: { placeId: true },
  });
  const existingIds = new Set(existing.map((lead) => lead.placeId));

  // 3) Upsert por placeId: cria se não existe, atualiza se já existe. Nunca duplica.
  const byWebsiteType: Record<WebsiteType, number> = { none: 0, social: 0, real: 0 };

  for (const place of places.values()) {
    const websiteType = classifyWebsite(place.websiteUri);
    byWebsiteType[websiteType]++;

    // Só os dados que vêm do Google. Status, notas, mensagem etc. são SEUS:
    // uma busca repetida nunca apaga o que você já trabalhou no lead.
    const googleData = {
      name: place.displayName?.text ?? "(sem nome)",
      address: place.formattedAddress ?? null,
      phone: place.nationalPhoneNumber ?? null,
      website: place.websiteUri ?? null,
      websiteType,
      rating: place.rating ?? null,
      reviewsCount: place.userRatingCount ?? null,
      mapsUrl: place.googleMapsUri ?? null,
    };

    await prisma.lead.upsert({
      where: { placeId: place.id },
      create: { placeId: place.id, category: segment, city, ...googleData },
      update: googleData,
    });
  }

  const usage = await getUsage(GOOGLE_PLACES, env.GOOGLE_MONTHLY_CALL_LIMIT);

  return {
    query: textQuery,
    pagesFetched,
    found: places.size,
    created: ids.filter((id) => !existingIds.has(id)).length,
    updated: ids.filter((id) => existingIds.has(id)).length,
    byWebsiteType,
    usage: { used: usage.used, limit: usage.limit, period: usage.period },
  };
}
