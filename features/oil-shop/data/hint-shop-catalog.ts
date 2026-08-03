/** Stable bootstrap catalogue; slugs preserve purchase history across reseeds. */
export const HINT_SHOP_CATALOG = [
  {
    slug: "single-spark-hint",
    name: "Single Spark",
    description: "One extra hint for the trail ahead.",
    cost: 50,
    grantQuantity: 1,
  },
  {
    slug: "traveler-hint-pack",
    name: "Traveler Pack",
    description: "Three extra hints, ready when recall gets difficult.",
    cost: 125,
    grantQuantity: 3,
  },
  {
    slug: "lantern-hint-pack",
    name: "Lantern Pack",
    description: "Five extra hints for a longer stretch of the journey.",
    cost: 200,
    grantQuantity: 5,
  },
] as const;

export const HINT_PACK_ITEM_TYPE = "HINT_PACK";
