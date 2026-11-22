// Cliente HTTP mínimo. Sempre chama /api/... (mesma origem);
// o rewrite do next.config manda pra API na porta 3333.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // A API sempre responde erros como { error: "mensagem legível", code? }.
    // Se nem isso vier (ex: API fora do ar), usamos uma mensagem genérica.
    const data = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
    throw new ApiError(res.status, data?.error ?? `Falha ao chamar ${path} (${res.status})`, data?.code);
  }
  return res.json() as Promise<T>;
}

export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body: unknown) => request<T>("POST", path, body);
export const apiPatch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
