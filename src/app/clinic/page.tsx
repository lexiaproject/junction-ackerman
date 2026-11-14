import type { Metadata } from "next";
import Clinic from "./Clinic";

export const metadata: Metadata = { title: "Relay · Clinic" };

export default function ClinicPage() {
  return <Clinic />;
}
