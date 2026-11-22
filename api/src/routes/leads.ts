import { Router } from "express";
import { z } from "zod";
import { LeadStatus } from "../generated/prisma/enums.js";
import { HttpError } from "../lib/errors.js";
import { LeadQuerySchema, buildLeadOrderBy, buildLeadWhere } from "../lib/leadFilters.js";
import { prisma } from "../lib/prisma.js";
import { buildLeadStats } from "../lib/stats.js";
import { env } from "../env.js";
import { qualifyLead, qualifyMany } from "../services/qualify.js";

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

// GET /leads/followups/today: quem está ENVIADO e já devia receber follow-up
// (hoje ou atrasado). Os mais atrasados vêm primeiro.
leadsRouter.get("/followups/today", async (_req, res) => {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999); // fuso do computador onde a API roda

  const items = await prisma.lead.findMany({
    where: { status: "ENVIADO", nextFollowupAt: { lte: endOfToday } },
    orderBy: { nextFollowupAt: "asc" },
  });
  res.json({ items, total: items.length });
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

  // Regra do funil: follow-up só existe pra quem está ENVIADO (esperando resposta).
  // Respondeu, marcou reunião, fechou ou foi descartado? O lembrete some.
  const followupRule = data.status && data.status !== "ENVIADO" ? { nextFollowupAt: null } : {};

  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: { ...data, ...followupRule },
  });
  res.json(lead);
});

// POST /leads/qualify: qualifica vários de uma vez (os selecionados na tabela).
const QualifyBatchSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, "Selecione pelo menos um lead")
    .max(env.QUALIFY_BATCH_MAX, `No máximo ${env.QUALIFY_BATCH_MAX} leads por vez`),
});

leadsRouter.post("/qualify", async (req, res) => {
  const { ids } = QualifyBatchSchema.parse(req.body);
  const unique = [...new Set(ids)];
  const results = await qualifyMany(unique);
  res.json({
    results,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  });
});

// POST /leads/:id/qualify: avaliações do Google → Claude → nota, gancho e mensagem.
leadsRouter.post("/:id/qualify", async (req, res) => {
  const lead = await qualifyLead(req.params.id);
  res.json(lead);
});

// POST /leads/:id/contacted: você clicou em "Abrir no WhatsApp".
// Marca como ENVIADO, guarda quando foi e agenda o follow-up pra daqui a 3 dias.
// (O envio em si é manual, no seu WhatsApp Business: a API nunca manda mensagem.)
export const FOLLOWUP_DAYS = 3;

const ContactedSchema = z
  .object({
    // o texto que você escolheu/editou, pra ficar registrado no lead
    message: z.string().trim().min(1).max(2000).optional(),
    // false = foi o "último contato": não agenda outro lembrete
    scheduleFollowup: z.boolean().default(true),
  })
  .strict();

leadsRouter.post("/:id/contacted", async (req, res) => {
  const { message, scheduleFollowup } = ContactedSchema.parse(req.body ?? {});

  const exists = await prisma.lead.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Lead não encontrado", "LEAD_NOT_FOUND");

  const now = new Date();
  const followup = new Date(now.getTime() + FOLLOWUP_DAYS * 24 * 60 * 60 * 1000);

  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: {
      status: "ENVIADO",
      contactedAt: now,
      nextFollowupAt: scheduleFollowup ? followup : null,
      ...(message ? { message } : {}),
    },
  });
  res.json(lead);
});
