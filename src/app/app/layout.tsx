import type { Metadata } from "next";
import AppShell from "./AppShell";

export const metadata: Metadata = { title: "Relay" };
// Las pantallas de la app se cargan en el navegador con la sesión; no aplica la validación de navegación instantánea
export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
