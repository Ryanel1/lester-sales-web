import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="notFound" id="main-content">
        <p>Resource not found</p>
        <h1>That page isn’t available in the resource library.</h1>
        <Link href="/">Return to the brand portfolio</Link>
      </main>
    </>
  );
}
