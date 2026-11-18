import { LeadStatus } from "../generated/prisma/enums.js";

export type StatusCounts = Record<LeadStatus, number>;

export type LeadStats = {
  total: number;
  byStatus: StatusCounts;
};

type GroupByRow = { status: LeadStatus; _count: { _all: number } };

/**
 * O `groupBy` do banco só devolve os status que TÊM leads.
 * Aqui completamos com zero os que faltam, pra o front sempre receber os 6.
 */
export function buildLeadStats(rows: GroupByRow[]): LeadStats {
  const byStatus = Object.fromEntries(
    Object.values(LeadStatus).map((status) => [status, 0]),
  ) as StatusCounts;

  for (const row of rows) {
    byStatus[row.status] = row._count._all;
  }

  const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
  return { total, byStatus };
}
