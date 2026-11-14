import { ImageResponse } from "next/og";
import { RelayMark } from "./relay-mark";

// Icono de la app (pestaña del navegador y app instalada)
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<RelayMark px={size.width} />, { ...size });
}
