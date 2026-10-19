/** New stable slugs retire old consumables without rewriting purchase snapshots. */
export const HINT_SHOP_CATALOG = [
  {
    slug: "small-hint-pack-v2",
    name: "Small pack",
    description: "Three extra hints for your next step.",
    cost: 120,
    grantQuantity: 3,
  },
  {
    slug: "medium-hint-pack-v2",
    name: "Medium pack",
    description: "Ten extra hints for the journey ahead.",
    cost: 300,
    grantQuantity: 10,
  },
  {
    slug: "large-hint-pack-v2",
    name: "Large pack",
    description: "Twenty-five extra hints, ready when you need them.",
    cost: 600,
    grantQuantity: 25,
  },
  {
    slug: "extra-hint-pack-v2",
    name: "Extra pack",
    description: "Fifty extra hints for a longer learning journey.",
    cost: 1000,
    grantQuantity: 50,
  },
] as const;

export const HINT_PACK_ITEM_TYPE = "HINT_PACK";
