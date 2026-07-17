import type { Metadata } from "next";
import { AdminArtPublisher } from "@/components/AdminArtPublisher";

export const metadata: Metadata = { title: "Art Library Manager" };
export default function ArtLibraryAdminPage() { return <AdminArtPublisher />; }
