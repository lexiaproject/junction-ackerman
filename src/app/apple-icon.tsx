import { ImageResponse } from "next/og";
import { RelayMark } from "./relay-mark";

// Icono para "Añadir a pantalla de inicio" en iPhone
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<RelayMark px={size.width} />, { ...size });
}
