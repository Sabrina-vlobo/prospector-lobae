// Erro "esperado", com status HTTP e mensagem pensada pra aparecer na tela.
// O errorHandler do app.ts transforma isso em resposta JSON.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
