"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiPatch } from "@/lib/api";
import type { Lead } from "@/lib/types";
import styles from "./NotesEditor.module.css";

/** Notas livres do lead ("ligar depois das 14h", "dono se chama João"...). */
export function NotesEditor({ lead }: { lead: Lead }) {
  const queryClient = useQueryClient();
  const saved = lead.notes ?? "";
  const [notes, setNotes] = useState(saved);
  const dirty = notes !== saved;

  const save = useMutation({
    // texto vazio vira null no banco (nota apagada)
    mutationFn: () => apiPatch<Lead>(`/leads/${lead.id}`, { notes: notes.trim() || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  return (
    <div className={styles.notes}>
      <label className={styles.label} htmlFor={`notes-${lead.id}`}>
        <span className="tag">Notas</span>
      </label>
      <textarea
        id={`notes-${lead.id}`}
        className={styles.textarea}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Ex: dono se chama João, prefere falar depois das 14h"
      />
      <div className={styles.foot}>
        <span className={styles.status} role="status">
          {save.isPending
            ? "Salvando…"
            : save.isError
              ? `Erro: ${save.error.message}`
              : dirty
                ? "Alterações não salvas"
                : save.isSuccess
                  ? "Salvo ✓"
                  : ""}
        </span>
        <button
          type="button"
          className={styles.save}
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
        >
          Salvar notas
        </button>
      </div>
    </div>
  );
}
