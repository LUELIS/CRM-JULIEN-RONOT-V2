import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Aurora CRM",
  description: "CRM personnel - Gestion clients, factures, devis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} font-sans antialiased`}
        style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
