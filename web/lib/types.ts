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
