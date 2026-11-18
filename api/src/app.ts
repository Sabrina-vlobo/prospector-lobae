import express, { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { healthRouter } from "./routes/health.js";
import { leadsRouter } from "./routes/leads.js";

// Criar o app numa função (sem dar `listen`) deixa o Supertest testar
// as rotas sem abrir porta nenhuma.
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());

  app.use("/health", healthRouter);
  app.use("/leads", leadsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Rota não encontrada" });
  });

  app.use(errorHandler);
  return app;
}

// Express 5 já encaminha pra cá os erros de handlers async.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Dados inválidos", issues: err.issues });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Erro interno" });
};
