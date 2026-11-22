// Espelho dos tipos que a API devolve. O front não importa nada do Prisma
// (nem pode: ele não tem banco), então descrevemos aqui só o formato do JSON.

export const LEAD_STATUSES = [
  "NOVO",
  "ENVIADO",
  "RESPONDEU",
  "REUNIAO",
  "FECHOU",
  "DESCARTADO",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type LeadStats = {
  total: number;
  byStatus: Record<LeadStatus, number>;
};

export type Health = {
  status: "ok" | "degraded";
  db: "up" | "down";
};

export type WebsiteType = "none" | "social" | "real";

export type SearchInput = {
  segment: string;
  city: string;
  pages: number;
  skipRealSites: boolean;
};

export type SearchSummary = {
  query: string;
  pagesFetched: number;
  found: number;
  created: number;
  updated: number;
  skipped: number;
  byWebsiteType: Record<WebsiteType, number>;
  usage: { used: number; limit: number; period: string };
};

export type Usage = {
  google: {
    period: string;
    used: number;
    limit: number;
    maxPagesPerSearch: number;
    configured: boolean;
  };
};
