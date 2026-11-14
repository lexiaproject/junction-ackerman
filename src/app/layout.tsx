import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

// Tipografía nórdica (diseñada para un diario noruego): sobria y muy legible
const sans = Schibsted_Grotesk({ variable: "--nf-sans", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Relay · peer support after TMS",
  description: "Every patient who gets better becomes the support for the next one.",
  appleWebApp: { capable: true, title: "Relay", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#17332d" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
