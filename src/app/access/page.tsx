import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/Icons";
import { getPortalAuthConfig, safeReturnPath } from "@/lib/portal-auth";

export const metadata: Metadata = {
  title: "Resource library access",
  robots: { follow: false, index: false },
};

type AccessPageProps = {
  searchParams: Promise<{ error?: string; next?: string; reason?: string }>;
};

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const params = await searchParams;
  const config = getPortalAuthConfig();
  const returnPath = safeReturnPath(params.next);
  const configurationError = params.reason === "configuration" || config.state === "misconfigured";
  const accessError = params.error === "invalid" || params.error === "rate-limit";

  return (
    <main className="accessPage" id="main-content">
      <section className="accessIntroduction" aria-labelledby="access-title">
        <Link className="accessWordmark" href="/" aria-label="Lester Sales home">
          <span>Lester</span> Sales
        </Link>
        <div className="accessIntroductionCopy">
          <h1 id="access-title">Everything you need, kept in one place.</h1>
          <p>Catalogs, pricing, open prebooks, and art resources organized to make your work easier.</p>
        </div>
        <p className="accessFootnote">Private access · LesterSales.net</p>
      </section>

      <section className="accessPanel" aria-labelledby="sign-in-title">
        <div className="accessFormWrap">
          <p className="accessEyebrow">Welcome back</p>
          <h2 id="sign-in-title">Open your resource library</h2>

          {configurationError ? (
            <div className="accessNotice accessNoticeError" role="alert">
              <strong>Portal access is not configured.</strong>
              <span>Set both server environment variables before opening the production library.</span>
            </div>
          ) : config.state === "disabled" ? (
            <div className="accessNotice">
              <strong>Access protection is off locally.</strong>
              <span>You can continue directly to the development library.</span>
            </div>
          ) : (
            <form action="/api/access" className="accessForm" method="post">
              <input name="next" type="hidden" value={returnPath} />
              <label htmlFor="password">Customer password</label>
              <input
                aria-describedby={accessError ? "access-error access-help" : "access-help"}
                aria-invalid={accessError || undefined}
                autoComplete="current-password"
                autoFocus
                id="password"
                name="password"
                placeholder="Enter password"
                required
                type="password"
              />
              {params.error === "invalid" && (
                <p className="accessError" id="access-error" role="alert">That password wasn’t recognized. Try again.</p>
              )}
              {params.error === "rate-limit" && (
                <p className="accessError" id="access-error" role="alert">Too many attempts. Wait ten minutes, then try again.</p>
              )}
              <button type="submit">
                Open resource library <ArrowRightIcon className="accessButtonIcon" />
              </button>
              <p className="accessHelp" id="access-help">
                Need the current password? <a href="mailto:info@lestersales.net">Contact Lester Sales</a>.
              </p>
            </form>
          )}

          {config.state === "disabled" && !configurationError && (
            <Link className="accessContinue" href={returnPath}>
              Open resource library <ArrowRightIcon className="accessButtonIcon" />
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
