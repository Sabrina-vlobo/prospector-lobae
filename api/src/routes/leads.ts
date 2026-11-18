import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { buildLeadStats } from "../lib/stats.js";

export const leadsRouter = Router();

// GET /leads/stats — quantos leads em cada status do funil.
leadsRouter.get("/stats", async (_req, res) => {
  const rows = await prisma.lead.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  res.json(buildLeadStats(rows));
});
