import type { Metadata } from "next";
import { AdminPrebookPublisher } from "@/components/AdminPrebookPublisher";

export const metadata: Metadata = { title: "Prebook Builder" };
export default function PrebookAdminPage() { return <AdminPrebookPublisher />; }
