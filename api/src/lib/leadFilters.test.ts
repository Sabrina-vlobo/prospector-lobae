import { describe, expect, it } from "vitest";
import { LeadQuerySchema, buildLeadOrderBy, buildLeadWhere } from "./leadFilters.js";

describe("LeadQuerySchema", () => {
  it("aplica os padrões quando a URL vem vazia", () => {
    expect(LeadQuerySchema.parse({})).toMatchObject({ sort: "reviews", page: 1, pageSize: 25 });
  });

  it("converte texto da URL em número e lista", () => {
    const query = LeadQuerySchema.parse({
      websiteType: "none, social",
      status: ["NOVO", "ENVIADO"],
      minRating: "4.5",
      minReviews: "50",
    });
    expect(query).toMatchObject({
      websiteType: ["none", "social"],
      status: ["NOVO", "ENVIADO"],
      minRating: 4.5,
      minReviews: 50,
    });
  });

  it.each([
    [{ websiteType: "blog" }],
    [{ status: "GANHOU" }],
    [{ minRating: "6" }],
    [{ pageSize: "500" }],
    [{ sort: "aleatorio" }],
  ])("recusa valor inválido %j", (raw) => {
    expect(() => LeadQuerySchema.parse(raw)).toThrow();
  });
});

describe("buildLeadWhere", () => {
  it("sem filtros = sem condições", () => {
    expect(buildLeadWhere(LeadQuerySchema.parse({}))).toEqual({});
  });

  it("monta cada condição só quando o filtro veio", () => {
    const where = buildLeadWhere(
      LeadQuerySchema.parse({ q: "barba", websiteType: "none,social", minRating: "4", minReviews: "0" }),
    );
    expect(where).toEqual({
      name: { contains: "barba", mode: "insensitive" },
      websiteType: { in: ["none", "social"] },
      rating: { gte: 4 },
      reviewsCount: { gte: 0 },
    });
  });
});

describe("buildLeadOrderBy", () => {
  it("por padrão, mais avaliações primeiro e sem dados no fim", () => {
    expect(buildLeadOrderBy("reviews")[0]).toEqual({ reviewsCount: { sort: "desc", nulls: "last" } });
  });

  it("ordena por nome em ordem alfabética", () => {
    expect(buildLeadOrderBy("name")).toEqual([{ name: "asc" }]);
  });
});
