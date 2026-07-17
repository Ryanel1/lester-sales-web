import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-public-sans",
  weight: ["400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: { default: "Lester Sales", template: "%s | Lester Sales" },
  description: "Current catalogs, pricing, prebooks, and art resources organized to support your work.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={publicSans.variable} data-scroll-behavior="smooth" lang="en">
      <body>
        <a className="skipLink" href="#main-content">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
