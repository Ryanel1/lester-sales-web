import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandPage } from "@/components/BrandPage";
import { PortalUnavailable } from "@/components/PortalUnavailable";
import { brands } from "@/data/portal";
import { getPublishedBrand, PortalDataUnavailableError } from "@/data/portal-query";

type BrandRouteProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return brands.map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({ params }: BrandRouteProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const brand = await getPublishedBrand(slug);
    return brand ? { title: brand.name, description: brand.shortDescription } : {};
  } catch (error) {
    if (error instanceof PortalDataUnavailableError) return { title: "Resources temporarily unavailable" };
    throw error;
  }
}

export default async function BrandRoute({ params }: BrandRouteProps) {
  const { slug } = await params;
  let brand;
  try {
    brand = await getPublishedBrand(slug);
  } catch (error) {
    if (error instanceof PortalDataUnavailableError) return <PortalUnavailable slug={slug} />;
    throw error;
  }
  if (!brand) notFound();
  return <BrandPage brand={brand} />;
}
