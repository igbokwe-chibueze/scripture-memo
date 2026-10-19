-- Atomic rollout: preserve all prior purchases/ledgers and hint entitlements.
BEGIN;
CREATE TABLE "UserAvatarOwnership" (
  "userId" TEXT NOT NULL,
  "avatarKey" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAvatarOwnership_pkey" PRIMARY KEY ("userId", "avatarKey"),
  CONSTRAINT "UserAvatarOwnership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UserAvatarOwnership_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "UserShopPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UserAvatarOwnership_paid_key_check" CHECK ("avatarKey" IN ('bull','owl','donkey','rabbit','fox','panda','elephant','giraffe','otter'))
);
CREATE UNIQUE INDEX "UserAvatarOwnership_purchaseId_key" ON "UserAvatarOwnership"("purchaseId");

-- Owner chose no grandfathered ownership. Reset paid portraits once at rollout,
-- never during normal reads or seeds, without changing frames or other progress.
UPDATE "UserProfile" SET "avatarKey" = 'lion', "updatedAt" = CURRENT_TIMESTAMP
WHERE "avatarKey" NOT IN ('lion', 'dove', 'deer');

-- Retire the previous offer rows; immutable entitlementQuantity snapshots remain.
UPDATE "ShopItem" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "itemType" = 'HINT_PACK';
INSERT INTO "ShopItem" ("id", "slug", "name", "description", "itemType", "grantQuantity", "cost", "isActive", "updatedAt") VALUES
('shop-small-v2','small-hint-pack-v2','Small pack','Three extra hints for your next step.','HINT_PACK',3,120,true,CURRENT_TIMESTAMP),
('shop-medium-v2','medium-hint-pack-v2','Medium pack','Ten extra hints for the journey ahead.','HINT_PACK',10,300,true,CURRENT_TIMESTAMP),
('shop-large-v2','large-hint-pack-v2','Large pack','Twenty-five extra hints, ready when you need them.','HINT_PACK',25,600,true,CURRENT_TIMESTAMP),
('shop-extra-v2','extra-hint-pack-v2','Extra pack','Fifty extra hints for a longer learning journey.','HINT_PACK',50,1000,true,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name", "description"=EXCLUDED."description", "grantQuantity"=EXCLUDED."grantQuantity", "cost"=EXCLUDED."cost", "isActive"=true, "updatedAt"=CURRENT_TIMESTAMP;

INSERT INTO "ShopItem" ("id", "slug", "name", "description", "itemType", "grantQuantity", "cost", "isActive", "updatedAt")
SELECT 'shop-avatar-' || key, 'avatar-' || key, key,
'A permanent ' || key || ' profile avatar.', 'AVATAR', 1, 250, true, CURRENT_TIMESTAMP
FROM unnest(ARRAY['bull','owl','donkey','rabbit','fox','panda','elephant','giraffe','otter']) AS key
ON CONFLICT ("slug") DO UPDATE SET "cost"=250, "isActive"=true, "updatedAt"=CURRENT_TIMESTAMP;
COMMIT;
