import type { Metadata } from "next";
import { Host_Grotesk, Silkscreen } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${hostGrotesk.variable} ${silkscreen.variable}`}>
      <body>
        <Providers>
          <div className="app-shell">
            <AppHeader />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
