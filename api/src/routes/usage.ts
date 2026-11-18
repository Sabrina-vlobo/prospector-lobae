import { Router } from "express";
import { env } from "../env.js";
import { GOOGLE_PLACES, getUsage } from "../lib/quota.js";

export const usageRouter = Router();

// GET /usage: quanto da cota mensal do Google já foi usado.
usageRouter.get("/", async (_req, res) => {
  const google = await getUsage(GOOGLE_PLACES, env.GOOGLE_MONTHLY_CALL_LIMIT);
  res.json({
    google: {
      ...google,
      maxPagesPerSearch: env.GOOGLE_MAX_PAGES_PER_SEARCH,
      configured: Boolean(env.GOOGLE_PLACES_API_KEY),
    },
  });
});
