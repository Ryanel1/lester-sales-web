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

// Brand metadata is the resilient navigation fallback. Published sales content lives only in Supabase.
export const brands: Brand[] = [
  {
    slug: "champion",
    name: "Champion",
    navLabel: "Champion",
    shortDescription:
      "Current collegiate apparel, program pricing, art collections, and limited-time booking opportunities.",
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
      "Collegiate and school apparel from Gear for Sports, plus garment-dyed ComfortWash collections and art programs.",
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
      "Collegiate performance apparel, headwear, accessories, pricing, and seasonal programs.",
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
      "Licensed professional-team programs gathered across brands in one clear destination.",
    accent: "#244c84",
    inlineCatalogs: [],
    prebooks: [],
    artGroups: [],
  },
];

export const brandBySlug = (slug: string) => brands.find((brand) => brand.slug === slug);

export const publishedResourceCount = (brand: Brand) =>
  brand.inlineCatalogs.length + brand.prebooks.length + brand.artGroups.length;
