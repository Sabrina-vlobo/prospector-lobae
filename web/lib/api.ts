// Cliente HTTP mínimo. Sempre chama /api/... (mesma origem);
// o rewrite do next.config manda pra API na porta 3333.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new ApiError(res.status, `GET ${path} falhou (${res.status})`);
  }
  return res.json() as Promise<T>;
}
