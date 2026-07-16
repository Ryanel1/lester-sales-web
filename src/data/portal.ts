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

const championArt: ArtGroup[] = [
  {
    title: "Decoration",
    resources: [
      { label: "Front chest screenprint", kind: "art" },
      { label: "Front chest embroidery", kind: "art" },
      { label: "Tackle twill", kind: "art" },
      { label: "Tackle twill with mascot", kind: "art" },
      { label: "Left chest embroidery", kind: "art" },
      { label: "Oversized graphics", kind: "art" },
    ],
  },
  {
    title: "Sport & audience",
    resources: [
      { label: "Football", kind: "art" },
      { label: "Baseball", kind: "art" },
      { label: "Mom, dad & alumni", kind: "art" },
      { label: "90s catalog flips", kind: "art" },
      { label: "Reverse Weave", kind: "art" },
    ],
  },
];

export const brands: Brand[] = [
  {
    slug: "champion",
    name: "Champion",
    navLabel: "Champion",
    shortDescription:
      "Current collegiate apparel, program pricing, art collections, and limited-time booking opportunities.",
    accent: "#c41230",
    inlineCatalogs: [
      {
        id: "champion-collegiate-2026",
        title: "Champion Collegiate 2026",
        season: "Current inline collection",
        image: "/catalogs/champion-collegiate-2026.jpg",
        imageAlt: "Cover of the Champion Collegiate 2026 catalog",
        summary:
          "The current collegiate apparel assortment, kept together with the pricing and program files used to build an order.",
        resources: [
          {
            label: "View catalog",
            kind: "catalog",
            sourceType: "storage_object",
            href: "/documents/champion/champion-collegiate-2026.pdf",
          },
          { label: "Base pricing", kind: "pricing" },
          { label: "High school pricing", kind: "pricing" },
          { label: "Curated programs", kind: "program" },
          { label: "Bookstore programs", kind: "program" },
        ],
      },
    ],
    prebooks: [],
    artGroups: championArt,
  },
  {
    slug: "gear-comfortwash",
    name: "Gear & ComfortWash",
    navLabel: "Gear & ComfortWash",
    shortDescription:
      "Collegiate and school apparel from Gear for Sports, plus garment-dyed ComfortWash collections and art programs.",
    accent: "#9d6b3f",
    inlineCatalogs: [
      {
        id: "gear-collegiate-2026",
        title: "Gear Collegiate 2026",
        season: "Current inline collection",
        image: "/catalogs/gear-collegiate-2026.jpg",
        imageAlt: "Cover of the Gear for Sports Collegiate 2026 catalog",
        summary:
          "The current Gear for Sports collegiate collection with its supporting pricing and savings-program materials.",
        resources: [
          {
            label: "View catalog",
            kind: "catalog",
            sourceType: "storage_object",
            href: "/documents/gear/gear-collegiate-2026.pdf",
          },
          { label: "Standard pricing", kind: "pricing" },
          { label: "High school pricing", kind: "pricing" },
          { label: "Savings program", kind: "program" },
        ],
      },
    ],
    prebooks: [],
    artGroups: [
      {
        title: "Gear art collections",
        resources: [
          { label: "Floral embroidery", kind: "art" },
          { label: "3-stripe front chest", kind: "art" },
          { label: "Tapestry embroidery", kind: "art" },
          { label: "Boucle", kind: "art" },
          { label: "Metallic applique twill", kind: "art" },
          { label: "Alumni art pack", kind: "art" },
          { label: "Mom art pack", kind: "art" },
          { label: "Dad art pack", kind: "art" },
        ],
      },
    ],
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
