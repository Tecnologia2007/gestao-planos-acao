import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--fonte-display-next" });
const corpo = Outfit({ subsets: ["latin"], variable: "--fonte-corpo-next" });

export const metadata: Metadata = {
  title: { default: "Central de Auditorias", template: "%s · Cicobi Central Nordeste" },
  description: "Acompanhamento de auditorias e planos de ação da Cicobi Central Nordeste.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`com-display com-corpo ${display.variable} ${corpo.variable}`}>{children}</body>
    </html>
  );
}
