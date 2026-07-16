import type { Metadata } from "next";
import { AdminCatalogPublisher } from "@/components/AdminCatalogPublisher";

export const metadata: Metadata = { title: "Portal Publisher" };

export default function AdminPage() {
  return <AdminCatalogPublisher />;
}
