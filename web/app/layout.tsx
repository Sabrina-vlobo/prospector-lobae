import type { Metadata, Viewport } from "next";
import { Host_Grotesk, Silkscreen } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { themeBootScript } from "@/lib/theme";
import { Providers } from "./providers";
import "./globals.css";

// next/font baixa as fontes no build e serve do próprio app:
// sem requisição pro Google no navegador e sem "pulo" de layout.
const hostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  variable: "--font-text",
  display: "swap",
});

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-tag",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LOBAE° Prospector",
  description: "Prospecção de pequenos negócios sem site, com primeiro contato pelo WhatsApp.",
};

// Cor da barra do navegador no celular acompanha o tema
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f2f6" },
    { media: "(prefers-color-scheme: dark)", color: "#070920" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: o script abaixo muda o data-theme do <html> antes do React,
    // e isso é de propósito (sem ele, o React reclamaria que o HTML "mudou").
    <html lang="pt-BR" className={`${hostGrotesk.variable} ${silkscreen.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
