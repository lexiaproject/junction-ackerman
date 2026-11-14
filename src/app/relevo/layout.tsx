import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./relevo.css";

// Tipografías de la especificación v3: Space Grotesk 600 para títulos, Inter para el resto
const display = Space_Grotesk({ variable: "--rv-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Inter({ variable: "--rv-body", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Relevo · recovery that passes forward",
  description: "A chain of TMS patients: each person is accompanied by someone a few months ahead.",
  appleWebApp: { capable: true, title: "Relevo", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#0e6b5c" };

export default function RelevoLayout({ children }: { children: React.ReactNode }) {
  return <div className={`rv ${display.variable} ${body.variable} flex min-h-dvh flex-1 flex-col`}>{children}</div>;
}
