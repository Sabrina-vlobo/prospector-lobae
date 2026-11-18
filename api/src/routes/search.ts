import { Router } from "express";
import { z } from "zod";
import { runSearch } from "../services/search.js";

export const searchRouter = Router();

// O que o front pode mandar. Qualquer coisa fora disso vira 400 (via errorHandler).
const SearchBodySchema = z.object({
  segment: z.string().trim().min(2, "Informe o segmento").max(60),
  city: z.string().trim().min(2, "Informe a cidade").max(60),
  pages: z.coerce.number().int().min(1).max(3).default(1),
});

// POST /search: busca no Google e salva os leads.
searchRouter.post("/", async (req, res) => {
  const input = SearchBodySchema.parse(req.body);
  const summary = await runSearch(input);
  res.json(summary);
});
