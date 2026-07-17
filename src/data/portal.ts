export type ResourceKind = "catalog" | "pricing" | "program" | "workbook" | "art";
export type ResourceSourceType = "external_url" | "storage_object";

export type PortalResource = {
  label: string;
  kind: ResourceKind;
  sourceType?: ResourceSourceType;
  href?: string;
};

export type CatalogEntry = {
  id: string;
  title: string;
  season: string;
  image: string;
  imageAlt: string;
  summary: string;
  resources: PortalResource[];
};

export type PrebookEntry = {
  id: string;
  title: string;
  season: string;
  status: "open" | "closing-soon";
  image: string;
  imageAlt: string;
  deadline: string;
  shipDate: string;
  minimums: string;
  details: string[];
  resources: PortalResource[];
};

export type ArtGroup = {
  title: string;
  resources: PortalResource[];
};

export type Brand = {
  slug: string;
  name: string;
  navLabel: string;
  shortDescription: string;
  accent: string;
  inlineCatalogs: CatalogEntry[];
  prebooks: PrebookEntry[];
  artGroups: ArtGroup[];
};

// Brand metadata is the resilient navigation fallback. Published customer content lives only in Supabase.
export const brands: Brand[] = [
  {
    slug: "champion",
    name: "Champion",
    navLabel: "Champion",
    shortDescription:
      "Collegiate apparel, current program pricing, art collections, and limited-time booking programs—all organized to help you find what you need.",
    accent: "#c41230",
    inlineCatalogs: [],
    prebooks: [],
    artGroups: [],
  },
  {
    slug: "gear-comfortwash",
    name: "Gear & ComfortWash",
    navLabel: "Gear & ComfortWash",
    shortDescription:
      "Gear for Sports collegiate and school apparel, plus ComfortWash collections and art programs, together in one place.",
    accent: "#9d6b3f",
    inlineCatalogs: [],
    prebooks: [],
    artGroups: [],
  },
  {
    slug: "under-armour",
    name: "Under Armour",
    navLabel: "Under Armour",
    shortDescription:
      "Collegiate performance apparel, headwear, accessories, pricing, and seasonal programs, organized for quick access.",
    accent: "#b5212c",
    inlineCatalogs: [],
    prebooks: [],
    artGroups: [],
  },
  {
    slug: "pro-sports",
    name: "Pro Sports",
    navLabel: "Pro Sports",
    shortDescription:
      "Professional-team catalogs and programs across brands, gathered in one place to make them easier to find.",
    accent: "#244c84",
    inlineCatalogs: [],
    prebooks: [],
    artGroups: [],
  },
];

export const brandBySlug = (slug: string) => brands.find((brand) => brand.slug === slug);

export const publishedResourceCount = (brand: Brand) =>
  brand.inlineCatalogs.length + brand.prebooks.length + brand.artGroups.length;
