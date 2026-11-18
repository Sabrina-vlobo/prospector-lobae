import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

// GET /health — a API está de pé E consegue falar com o banco?
healthRouter.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "up" });
  } catch {
    res.status(503).json({ status: "degraded", db: "down" });
  }
});
