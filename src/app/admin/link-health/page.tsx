import type { Metadata } from "next";
import { AdminLinkHealth } from "@/components/AdminLinkHealth";

export const metadata: Metadata = { title: "Link Health" };
export default function LinkHealthPage() { return <AdminLinkHealth />; }
