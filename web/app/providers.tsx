"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// O QueryClient guarda o cache das requisições. Criamos dentro de um useState
// pra ter UMA instância por aba do navegador (e não recriar a cada render).
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // dado com menos de 30s é "fresco": não refaz a busca
            retry: 1,
            refetchOnWindowFocus: true, // voltou pra aba (ex: depois do WhatsApp)? atualiza
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
