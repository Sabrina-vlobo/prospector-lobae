import { useEffect, useState } from "react";

/**
 * Devolve o valor só depois que ele "para de mudar" por `delay` ms.
 * Usado na busca por nome: sem isso, cada letra digitada viraria uma requisição.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    // Se o valor mudar antes do tempo, o timer anterior é cancelado.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
