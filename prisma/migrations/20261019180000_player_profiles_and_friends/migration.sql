-- Add handles without inventing choices for existing players. Existing public
-- UUIDs, account IDs and all learner history remain unchanged. PostgreSQL's
-- nullable uniqueness permits multiple players who have not chosen a handle.
ALTER TABLE "UserProfile" ADD COLUMN "username" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "usernameChangedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "UserProfile_username_key" ON "UserProfile"("username");
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_username_format"
  CHECK ("username" IS NULL OR "username" ~ '^[a-z0-9_]{3,24}$');

ALTER TYPE "UserNotificationType" ADD VALUE 'FRIEND_REQUEST';
ALTER TYPE "UserNotificationType" ADD VALUE 'FRIEND_ACCEPTED';
CREATE TYPE "PlayerFriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- Pair ordering is deterministic in application code; constraints independently
-- reject self-links, inverted duplicates and forged third-party request owners.
CREATE TABLE "PlayerFriendship" (
  "lowUserId" TEXT NOT NULL,
  "highUserId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "status" "PlayerFriendshipStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "PlayerFriendship_pkey" PRIMARY KEY ("lowUserId", "highUserId"),
  CONSTRAINT "PlayerFriendship_pair_check" CHECK ("lowUserId" COLLATE "C" < "highUserId" COLLATE "C"),
  CONSTRAINT "PlayerFriendship_requester_check" CHECK ("requesterId" IN ("lowUserId", "highUserId")),
  CONSTRAINT "PlayerFriendship_acceptance_check" CHECK (
    ("status" = 'PENDING' AND "acceptedAt" IS NULL) OR
    ("status" = 'ACCEPTED' AND "acceptedAt" IS NOT NULL)
  ),
  CONSTRAINT "PlayerFriendship_lowUserId_fkey" FOREIGN KEY ("lowUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlayerFriendship_highUserId_fkey" FOREIGN KEY ("highUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PlayerFriendship_lowUserId_status_createdAt_idx" ON "PlayerFriendship"("lowUserId", "status", "createdAt");
CREATE INDEX "PlayerFriendship_highUserId_status_createdAt_idx" ON "PlayerFriendship"("highUserId", "status", "createdAt");

-- Blocking is directional and private. Repositories serialize both participants
-- before removing connections and creating a block, preventing acceptance races.
CREATE TABLE "PlayerBlock" (
  "blockerId" TEXT NOT NULL,
  "blockedId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerBlock_pkey" PRIMARY KEY ("blockerId", "blockedId"),
  CONSTRAINT "PlayerBlock_self_check" CHECK ("blockerId" <> "blockedId"),
  CONSTRAINT "PlayerBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlayerBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PlayerBlock_blockedId_blockerId_idx" ON "PlayerBlock"("blockedId", "blockerId");
