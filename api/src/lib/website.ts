import type { WebsiteType } from "../generated/prisma/enums.js";

// Domínios que NÃO contam como "site próprio": rede social, link na bio,
// WhatsApp e marketplaces. Pra quem prospecta, esses negócios ainda são
// ótimos leads — têm presença online, mas não têm um site deles.
const SOCIAL_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "fb.me",
  "m.me",
  "wa.me",
  "whatsapp.com",
  "linktr.ee",
  "linkin.bio",
  "beacons.ai",
  "bio.link",
  "taplink.cc",
  "tiktok.com",
  "youtube.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "ifood.com.br",
  "booksy.com",
  "goo.gl",
  "g.page",
];

/** Tira "www." e devolve só o host em minúsculas. Null se não der pra ler a URL. */
export function hostOf(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  // o Google às vezes devolve sem protocolo; o construtor URL exige um
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * none   → não tem nada
 * social → só rede social / link na bio / WhatsApp / marketplace
 * real   → domínio próprio
 */
export function classifyWebsite(url: string | null | undefined): WebsiteType {
  if (!url) return "none";
  const host = hostOf(url);
  if (!host) return "none";

  // "pt-br.facebook.com" também é Facebook: confere o domínio e os subdomínios
  const isSocial = SOCIAL_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  return isSocial ? "social" : "real";
}
