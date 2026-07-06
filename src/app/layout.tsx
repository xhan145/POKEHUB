import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";

import "@/styles/globals.css";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap"
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-terminal",
  display: "swap"
});

export const metadata: Metadata = {
  title: "POKEHUB",
  description: "Pokemon TCG market intelligence dashboard"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${pressStart2P.variable} ${vt323.variable}`}>{children}</body>
    </html>
  );
}
