import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Panel EVYM — Marketing de contenido",
  description:
    "Panel de marketing para Entre Vivos y Muertos, Antojo y perfil personal: métricas, contenido, ideas, giveaway y pendientes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-page font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
