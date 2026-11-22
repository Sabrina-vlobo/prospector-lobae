import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { LeadStatus, WebsiteType } from "../generated/prisma/enums.js";

// Filtros chegam pela URL: /leads?websiteType=none,social&minRating=4&q=barba
// Tudo na URL é texto, então o zod converte ("4" → 4) e valida.

/** "none,social" → ["none", "social"]. Aceita também ?websiteType=none&websiteType=social */
const csvEnum = <T extends string>(values: readonly [T, ...T[]]) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((raw) =>
      raw === undefined
        ? undefined
        : (Array.isArray(raw) ? raw : raw.split(",")).map((v) => v.trim()).filter(Boolean),
    )
    .pipe(z.array(z.enum(values)).optional());

const websiteTypes = Object.values(WebsiteType) as [WebsiteType, ...WebsiteType[]];
const statuses = Object.values(LeadStatus) as [LeadStatus, ...LeadStatus[]];

export const SORTS = ["reviews", "rating", "name", "recent"] as const;

export const LeadQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  websiteType: csvEnum(websiteTypes),
  status: csvEnum(statuses),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minReviews: z.coerce.number().int().min(0).optional(),
  sort: z.enum(SORTS).default("reviews"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type LeadQuery = z.infer<typeof LeadQuerySchema>;

/** Monta o WHERE do Prisma. Filtro vazio = não filtra por aquele campo. */
export function buildLeadWhere(query: LeadQuery): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};

  if (query.q) where.name = { contains: query.q, mode: "insensitive" };
  if (query.websiteType?.length) where.websiteType = { in: query.websiteType };
  if (query.status?.length) where.status = { in: query.status };
  if (query.minRating !== undefined) where.rating = { gte: query.minRating };
  if (query.minReviews !== undefined) where.reviewsCount = { gte: query.minReviews };

  return where;
}

/** Ordenação. Quem não tem nota/avaliações vai pro fim (nulls: "last"). */
export function buildLeadOrderBy(sort: LeadQuery["sort"]): Prisma.LeadOrderByWithRelationInput[] {
  switch (sort) {
    case "rating":
      return [{ rating: { sort: "desc", nulls: "last" } }, { reviewsCount: { sort: "desc", nulls: "last" } }];
    case "name":
      return [{ name: "asc" }];
    case "recent":
      return [{ createdAt: "desc" }];
    case "reviews":
    default:
      return [{ reviewsCount: { sort: "desc", nulls: "last" } }, { rating: { sort: "desc", nulls: "last" } }];
  }
}
