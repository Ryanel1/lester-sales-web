import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandPage } from "@/components/BrandPage";
import { brands } from "@/data/portal";
import { getPublishedBrand } from "@/data/portal-query";

type BrandRouteProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return brands.map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({ params }: BrandRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getPublishedBrand(slug);
  return brand ? { title: brand.name, description: brand.shortDescription } : {};
}

export default async function BrandRoute({ params }: BrandRouteProps) {
  const { slug } = await params;
  const brand = await getPublishedBrand(slug);
  if (!brand) notFound();
  return <BrandPage brand={brand} />;
}
