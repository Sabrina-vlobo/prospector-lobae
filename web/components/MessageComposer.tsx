"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiPost } from "@/lib/api";
import { buildMessageOptions, type TemplateId } from "@/lib/messageTemplates";
import { normalizeBrazilPhone, whatsappLink } from "@/lib/phone";
import type { Lead } from "@/lib/types";
import styles from "./MessageComposer.module.css";

/** "25/11" */
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export function MessageComposer({ lead }: { lead: Lead }) {
  const queryClient = useQueryClient();

  // useMemo: só remonta os textos quando o lead muda (não a cada letra digitada)
  const options = useMemo(() => buildMessageOptions(lead), [lead]);

  // Abre na mensagem salva (se houver); senão, no modelo "Direta".
  const [selectedId, setSelectedId] = useState<TemplateId>(options.at(3)?.id ?? "direta");
  const selected = options.find((o) => o.id === selectedId) ?? options[0]!;
  const [text, setText] = useState(selected.text);

  const edited = text !== selected.text;
  const phone = normalizeBrazilPhone(lead.phone);
  const canSend = Boolean(phone) && text.trim().length > 0;

  const contacted = useMutation({
    mutationFn: () => apiPost<Lead>(`/leads/${lead.id}/contacted`, { message: text.trim() }),
    // Status, contadores e follow-up mudaram: recarrega tudo que é ["leads", ...]
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  function chooseTemplate(id: TemplateId) {
    const option = options.find((o) => o.id === id);
    if (!option) return;
    setSelectedId(id);
    setText(option.text); // trocar de modelo substitui o texto
  }

  return (
    <div className={styles.composer}>
      <div className={styles.head}>
        <span className="tag">Mensagem</span>
        {edited && (
          <button type="button" className={styles.reset} onClick={() => setText(selected.text)}>
            Voltar ao modelo
          </button>
        )}
      </div>

      {/* Os modelos funcionam como "abas": role=radiogroup diz isso pro leitor de tela */}
      <div className={styles.options} role="radiogroup" aria-label="Modelo de mensagem">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === selectedId}
            className={styles.option}
            onClick={() => chooseTemplate(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className={styles.field}>
        <span className="visually-hidden">Texto da mensagem para {lead.name}</span>
        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
        />
      </label>

      <div className={styles.foot}>
        <span className={styles.counter}>
          {text.length} caracteres{edited && " · editada"}
        </span>

        {canSend ? (
          // Um link de verdade (<a>), não window.open: o navegador nunca bloqueia,
          // e o clique também avisa a API que você contatou esse lead.
          <a
            className={`btn ${styles.whatsapp}`}
            href={whatsappLink(phone!, text.trim())}
            target="_blank"
            rel="noreferrer"
            onClick={() => contacted.mutate()}
          >
            Abrir no WhatsApp
          </a>
        ) : (
          <button type="button" className={`btn ${styles.whatsapp}`} disabled>
            Abrir no WhatsApp
          </button>
        )}
      </div>

      {!phone && (
        <p className={styles.hint}>
          {lead.phone
            ? `O telefone "${lead.phone}" não parece um número brasileiro válido pro WhatsApp.`
            : "Esse negócio não tem telefone no Google."}
        </p>
      )}

      {contacted.isError && (
        <p className={styles.error} role="alert">
          O WhatsApp abriu, mas não consegui marcar como enviado: {contacted.error.message}
        </p>
      )}

      {lead.contactedAt && (
        <p className={styles.sent} role="status">
          Contatado em {shortDate(lead.contactedAt)}
          {lead.nextFollowupAt && <> · follow-up em {shortDate(lead.nextFollowupAt)}</>}
        </p>
      )}
    </div>
  );
}
