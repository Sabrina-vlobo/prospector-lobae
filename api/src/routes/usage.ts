import { Router } from "express";
import { env } from "../env.js";
import { ANTHROPIC, GOOGLE_PLACE_DETAILS, GOOGLE_PLACES, getUsage } from "../lib/quota.js";

export const usageRouter = Router();

// GET /usage: quanto de cada cota mensal já foi usado.
usageRouter.get("/", async (_req, res) => {
  const [google, googleDetails, anthropic] = await Promise.all([
    getUsage(GOOGLE_PLACES, env.GOOGLE_MONTHLY_CALL_LIMIT),
    getUsage(GOOGLE_PLACE_DETAILS, env.GOOGLE_DETAILS_MONTHLY_LIMIT),
    getUsage(ANTHROPIC, env.ANTHROPIC_MONTHLY_CALL_LIMIT),
  ]);

  res.json({
    google: {
      ...google,
      maxPagesPerSearch: env.GOOGLE_MAX_PAGES_PER_SEARCH,
      configured: Boolean(env.GOOGLE_PLACES_API_KEY),
    },
    googleDetails,
    anthropic: {
      ...anthropic,
      model: env.ANTHROPIC_MODEL,
      batchMax: env.QUALIFY_BATCH_MAX,
      configured: Boolean(env.ANTHROPIC_API_KEY),
    },
  });
});
