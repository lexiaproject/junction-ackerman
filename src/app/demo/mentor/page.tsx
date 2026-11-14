import type { Metadata } from "next";
import MobileApp from "../MobileApp";

export const metadata: Metadata = { title: "Relay demo · Mikko" };

export default function MentorPage() {
  return <MobileApp role="mentor" />;
}
