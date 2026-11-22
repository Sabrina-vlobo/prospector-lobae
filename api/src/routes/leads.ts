import { Router } from "express";
import { z } from "zod";
import { LeadStatus } from "../generated/prisma/enums.js";
import { HttpError } from "../lib/errors.js";
import { LeadQuerySchema, buildLeadOrderBy, buildLeadWhere } from "../lib/leadFilters.js";
import { prisma } from "../lib/prisma.js";
import { buildLeadStats } from "../lib/stats.js";

export const leadsRouter = Router();

// GET /leads/stats: quantos leads em cada status do funil.
// (Fica ANTES de qualquer rota "/:id", senão o Express acharia que "stats" é um id.)
leadsRouter.get("/stats", async (_req, res) => {
  const rows = await prisma.lead.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  res.json(buildLeadStats(rows));
});

// GET /leads: lista com filtros, ordenação e paginação.
leadsRouter.get("/", async (req, res) => {
  const query = LeadQuerySchema.parse(req.query);
  const where = buildLeadWhere(query);

  // As duas consultas rodam em paralelo: a página de itens e o total (pra paginação).
  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: buildLeadOrderBy(query.sort),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({ items, total, page: query.page, pageSize: query.pageSize });
});

// PATCH /leads/:id: muda só o que veio no body (status, notas, mensagem).
// .strict() recusa campos desconhecidos: ninguém troca o placeId ou o nome por aqui.
const LeadPatchSchema = z
  .object({
    status: z.enum(Object.values(LeadStatus) as [LeadStatus, ...LeadStatus[]]).optional(),
    notes: z.string().max(5000).nullable().optional(),
    message: z.string().max(2000).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Nada pra atualizar");

leadsRouter.patch("/:id", async (req, res) => {
  const data = LeadPatchSchema.parse(req.body);

  const exists = await prisma.lead.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Lead não encontrado", "LEAD_NOT_FOUND");

  const lead = await prisma.lead.update({ where: { id: req.params.id }, data });
  res.json(lead);
});
