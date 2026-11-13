import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const body = Atkinson_Hyperlegible({ variable: "--nf-body", subsets: ["latin"], weight: ["400", "700"] });
const display = Bricolage_Grotesque({ variable: "--nf-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Relay · peer support after TMS",
  description: "Every patient who gets better becomes the support for the next one.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
