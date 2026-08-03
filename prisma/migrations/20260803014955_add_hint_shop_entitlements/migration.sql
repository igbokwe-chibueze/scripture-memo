/*
  Warnings:

  - Added the required column `entitlementQuantity` to the `UserShopPurchase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "RewardEventType" ADD VALUE 'SHOP_PURCHASE';

-- AlterTable
ALTER TABLE "ShopItem" ADD COLUMN     "grantQuantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserShopPurchase" ADD COLUMN     "entitlementQuantity" INTEGER NOT NULL;
