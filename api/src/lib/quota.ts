import { prisma } from "./prisma.js";
import { HttpError } from "./errors.js";

export const GOOGLE_PLACES = "google_places";

/** Mês atual no formato "2026-11" (UTC). */
export function currentPeriod(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export async function getUsage(provider: string, limit: number) {
  const period = currentPeriod();
  const row = await prisma.apiUsage.findUnique({
    where: { provider_period: { provider, period } },
  });
  return { provider, period, used: row?.calls ?? 0, limit };
}

/**
 * "Reserva" 1 chamada ANTES de chamar a API paga.
 * O UPDATE só acontece se `calls < limit` — o banco faz a checagem e o +1
 * num passo só, então duas buscas ao mesmo tempo não furam o limite.
 * Se a chamada ao Google falhar depois, ela continua contada (melhor errar pra menos).
 */
export async function reserveCall(provider: string, limit: number): Promise<void> {
  const period = currentPeriod();

  // garante que a linha do mês existe (começa em 0)
  await prisma.apiUsage.upsert({
    where: { provider_period: { provider, period } },
    create: { provider, period, calls: 0 },
    update: {},
  });

  const { count } = await prisma.apiUsage.updateMany({
    where: { provider, period, calls: { lt: limit } },
    data: { calls: { increment: 1 } },
  });

  if (count === 0) {
    throw new HttpError(
      429,
      `Limite mensal de ${limit} chamadas ao Google atingido. Ajuste GOOGLE_MONTHLY_CALL_LIMIT no api/.env se quiser liberar mais.`,
      "QUOTA_EXCEEDED",
    );
  }
}
