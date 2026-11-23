"use client";

import { WhatsappLogo } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiPost } from "@/lib/api";
import { shortDate } from "@/lib/dates";
import {
  buildFollowupOptions,
  buildMessageOptions,
  type MessageOption,
  type TemplateId,
} from "@/lib/messageTemplates";
import { normalizeBrazilPhone, whatsappLink } from "@/lib/phone";
import type { Lead } from "@/lib/types";
import styles from "./MessageComposer.module.css";

// O compositor muda de "modo" conforme o status do lead:
// - first:     NOVO → modelos de primeiro contato; o clique marca ENVIADO + follow-up
// - followup:  ENVIADO → modelos de follow-up; o clique agenda o próximo lembrete
// - free:      já respondeu (ou além) → texto livre; o clique só abre a conversa
type Mode = "first" | "followup" | "free";

function modeFor(lead: Lead): Mode {
  if (lead.status === "NOVO") return "first";
  if (lead.status === "ENVIADO") return "followup";
  return "free";
}

const TITLES: Record<Mode, string> = {
  first: "Primeiro contato",
  followup: "Follow-up",
  free: "Conversa em andamento",
};

/**
 * Importante: quem usa este componente passa `key={lead.id + lead.status}`.
 * Assim, quando o status muda, o React cria um compositor novo (com os modelos certos)
 * em vez de reaproveitar o texto do modo anterior.
 */
export function MessageComposer({ lead }: { lead: Lead }) {
  const queryClient = useQueryClient();
  const mode = modeFor(lead);

  // useMemo: só remonta os textos quando o lead muda (não a cada letra digitada)
  const options = useMemo<MessageOption[]>(() => {
    if (mode === "first") return buildMessageOptions(lead);
    if (mode === "followup") return buildFollowupOptions(lead);
    return [];
  }, [lead, mode]);

  // Primeiro contato: abre na mensagem salva (IA/última), se houver. Follow-up: no "Lembrete leve".
  const initialId: TemplateId | null =
    mode === "first" ? (options.at(3)?.id ?? "direta") : mode === "followup" ? "followup-leve" : null;
  const [selectedId, setSelectedId] = useState<TemplateId | null>(initialId);
  const selected = options.find((o) => o.id === selectedId) ?? null;
  const [text, setText] = useState(selected?.text ?? "");

  const edited = selected ? text !== selected.text : false;
  const phone = normalizeBrazilPhone(lead.phone);
  const canSend = Boolean(phone) && text.trim().length > 0;

  const contacted = useMutation({
    mutationFn: () =>
      apiPost<Lead>(`/leads/${lead.id}/contacted`, {
        message: text.trim(),
        scheduleFollowup: selected?.scheduleFollowup ?? true,
      }),
    // Status, contadores e follow-ups mudaram: recarrega tudo que é ["leads", ...]
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  function chooseTemplate(option: MessageOption) {
    setSelectedId(option.id);
    setText(option.text); // trocar de modelo substitui o texto
  }

  return (
    <div className={styles.composer}>
      <div className={styles.head}>
        <span className="label">{TITLES[mode]}</span>
        {edited && selected && (
          <button type="button" className={styles.reset} onClick={() => setText(selected.text)}>
            Voltar ao modelo
          </button>
        )}
      </div>

      {/* No follow-up, mostra o que já foi enviado, pra você lembrar o contexto */}
      {mode === "followup" && lead.message && (
        <details className={styles.previous}>
          <summary>
            Mensagem anterior{lead.contactedAt && ` (${shortDate(lead.contactedAt)})`}
          </summary>
          <p>{lead.message}</p>
        </details>
      )}

      {options.length > 0 && (
        // Os modelos funcionam como opções de rádio: role=radiogroup diz isso pro leitor de tela
        <div className={styles.options} role="radiogroup" aria-label="Modelo de mensagem">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={option.id === selectedId}
              className={styles.option}
              onClick={() => chooseTemplate(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <label className={styles.field}>
        <span className="visually-hidden">Texto da mensagem para {lead.name}</span>
        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={mode === "free" ? 4 : 8}
          placeholder={mode === "free" ? "Escreva aqui (ou deixe em branco e escreva direto no WhatsApp)" : undefined}
        />
      </label>

      <div className={styles.foot}>
        <span className={styles.counter}>
          {text.length} caracteres{edited && " · editada"}
        </span>

        {mode === "free" ? (
          // Conversa já andando: só abre o WhatsApp, sem mexer no status
          phone ? (
            <a className={`btn ${styles.whatsapp}`} href={whatsappLink(phone, text.trim())} target="_blank" rel="noreferrer">
              <WhatsappLogo size={18} weight="fill" aria-hidden />
              Abrir conversa no WhatsApp
            </a>
          ) : (
            <button type="button" className={`btn ${styles.whatsapp}`} disabled>
              <WhatsappLogo size={18} weight="fill" aria-hidden />
              Abrir conversa no WhatsApp
            </button>
          )
        ) : canSend ? (
          // Um link de verdade (<a>), não window.open: o navegador nunca bloqueia,
          // e o clique também avisa a API que você contatou esse lead.
          <a
            className={`btn ${styles.whatsapp}`}
            href={whatsappLink(phone!, text.trim())}
            target="_blank"
            rel="noreferrer"
            onClick={() => contacted.mutate()}
          >
            <WhatsappLogo size={18} weight="fill" aria-hidden />
            Abrir no WhatsApp
          </a>
        ) : (
          <button type="button" className={`btn ${styles.whatsapp}`} disabled>
            <WhatsappLogo size={18} weight="fill" aria-hidden />
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

      {selected?.scheduleFollowup === false && (
        <p className={styles.hint}>Depois desse, nenhum novo follow-up será agendado.</p>
      )}

      {contacted.isError && (
        <p className={styles.error} role="alert">
          O WhatsApp abriu, mas não consegui registrar o contato: {contacted.error.message}
        </p>
      )}

      {lead.contactedAt && (
        <p className={styles.sent} role="status">
          Último contato em {shortDate(lead.contactedAt)}
          {lead.nextFollowupAt ? <> · follow-up em {shortDate(lead.nextFollowupAt)}</> : " · sem follow-up agendado"}
        </p>
      )}
    </div>
  );
}
