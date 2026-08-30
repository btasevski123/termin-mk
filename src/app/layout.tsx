import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Termin — Спортска сала Зоран Стојановски",
  description: "Резервирај термин на спортската сала во Ресен",
  appleWebApp: {
    capable: true,
    title: "Termin",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b120e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="mk" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
