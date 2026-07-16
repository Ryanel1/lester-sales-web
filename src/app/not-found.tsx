import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="notFound" id="main-content">
        <p>Resource not found</p>
        <h1>That page is not in the customer library.</h1>
        <Link href="/">Return to all brands</Link>
      </main>
    </>
  );
}
