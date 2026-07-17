import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/Icons";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const portfolioBrands = [
  {
    className: "portfolioBrandChampion",
    description: "Heritage athleticwear and collegiate apparel.",
    height: 844,
    href: "/brands/champion",
    image: "/brand-logos/champion-logo.png",
    imageAlt: "Champion",
    name: "Champion",
    width: 1500,
  },
  {
    className: "portfolioBrandUnderArmour",
    description: "Performance apparel, headwear, and accessories.",
    height: 300,
    href: "/brands/under-armour",
    image: "/brand-logos/under-armour-logo.png",
    imageAlt: "Under Armour",
    name: "Under Armour",
    width: 300,
  },
  {
    className: "portfolioBrandGear",
    description: "Decorated collegiate and school apparel.",
    height: 275,
    href: "/brands/gear-comfortwash",
    image: "/brand-logos/gear-for-sports-logo.jpg",
    imageAlt: "Gear for Sports",
    name: "Gear for Sports",
    width: 275,
  },
  {
    className: "portfolioBrandComfortWash",
    description: "Garment-dyed tees and fleece built around color and softness.",
    height: 225,
    href: "/brands/gear-comfortwash",
    image: "/brand-logos/comfortwash-logo.png",
    imageAlt: "ComfortWash",
    name: "ComfortWash",
    width: 225,
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="portfolioHero">
          <div className="portfolioHeroInner">
            <h1>Our brand portfolio.</h1>
            <div className="portfolioHeroIntroduction">
              <p>
                Champion, Under Armour, Gear for Sports, and ComfortWash—represented with the
                catalogs, pricing, art, and programs that support the sale.
              </p>
              <span>Select a brand to open its current customer resources.</span>
            </div>
          </div>
        </section>

        <section aria-label="Brand partners" className="portfolioShowcase">
          <div className="portfolioGrid">
            {portfolioBrands.map((brand) => (
              <Link
                aria-label={`Explore ${brand.name} resources`}
                className={`portfolioBrand ${brand.className}`}
                href={brand.href}
                key={brand.name}
              >
                <div className="portfolioBrandMark">
                  <Image
                    alt={brand.imageAlt}
                    height={brand.height}
                    priority
                    sizes="(max-width: 760px) 72vw, (max-width: 1100px) 38vw, 420px"
                    src={brand.image}
                    width={brand.width}
                  />
                </div>
                <div className="portfolioBrandDetails">
                  <div>
                    <h2>{brand.name}</h2>
                    <p>{brand.description}</p>
                  </div>
                  <span className="portfolioBrandArrow" aria-hidden="true">
                    <ArrowRightIcon />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="proSportsPortfolio">
          <div className="proSportsPortfolioInner">
            <div>
              <p>Licensed team programs across the portfolio</p>
              <h2>Pro Sports</h2>
            </div>
            <p>
              Find current professional-team catalogs and programs in one destination, regardless
              of the brand producing the assortment.
            </p>
            <Link href="/brands/pro-sports">
              View Pro Sports <ArrowRightIcon />
            </Link>
          </div>
        </section>

      </main>
      <SiteFooter variant="portfolio" />
    </>
  );
}
