import type { Metadata } from "next";
import Link from "next/link";
import { AccessMotion } from "@/components/AccessMotion";
import { getPortalAuthConfig, safeReturnPath } from "@/lib/portal-auth";

export const metadata: Metadata = {
  title: "Sign in",
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
      <AccessMotion>
        <header className="accessBrand">
          <Link className="wordmark accessWordmark" href="/" aria-label="Lester Sales home">
            <span>Lester</span> Sales
          </Link>
          <p className="accessTagline">Ordering made easy.</p>
        </header>

        <section className="accessPanel" aria-labelledby="sign-in-title">
          <div className="accessFormWrap">
            <h1 id="sign-in-title">Welcome Back</h1>
            <p className="accessIntroduction">Please enter your password below.</p>

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
                <input
                  aria-label="Password"
                  aria-describedby={accessError ? "access-error access-help" : "access-help"}
                  aria-invalid={accessError || undefined}
                  autoComplete="current-password"
                  autoFocus
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  required
                  type="password"
                />
                {params.error === "invalid" && (
                  <p className="accessError" id="access-error" role="alert">That password wasn’t recognized. Try again.</p>
                )}
                {params.error === "rate-limit" && (
                  <p className="accessError" id="access-error" role="alert">Too many attempts. Wait ten minutes, then try again.</p>
                )}
                <button type="submit">Sign In</button>
                <p className="accessHelp" id="access-help">
                  <a href="mailto:ryanlestersells@gmail.com">Contact us for access</a>
                </p>
              </form>
            )}

            {config.state === "disabled" && !configurationError && (
              <>
                <Link className="accessContinue" href={returnPath}>Sign In</Link>
                <p className="accessHelp" id="access-help">
                  <a href="mailto:ryanlestersells@gmail.com">Contact us for access</a>
                </p>
              </>
            )}
          </div>
        </section>
      </AccessMotion>
    </main>
  );
}
