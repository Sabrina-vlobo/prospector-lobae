import { defineConfig } from "vitest/config";

// Testes das funções puras do front (telefone, modelos de mensagem).
// Não precisam de navegador: rodam direto no Node.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
