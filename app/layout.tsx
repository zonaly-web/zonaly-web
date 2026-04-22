import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic", "normal"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Zonaly — Analysez n'importe quelle zone",
  description:
    "Scores immobilier, environnement, sécurité et vie de quartier. Contextualisés pour vous. Pas juste affichés.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${outfit.variable} ${playfair.variable} h-full overscroll-y-none antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
