import type { Metadata } from "next";
import MobileApp from "../MobileApp";

export const metadata: Metadata = { title: "Relay demo · Laura" };

export default function PupilPage() {
  return <MobileApp role="pupil" />;
}
