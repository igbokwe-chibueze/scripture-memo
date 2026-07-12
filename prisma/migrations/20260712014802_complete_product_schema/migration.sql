-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "TranslationCode" AS ENUM ('NIV', 'ESV', 'KJV');

-- CreateEnum
CREATE TYPE "WaypointStatus" AS ENUM ('LOCKED', 'UNLOCKED', 'IN_PROGRESS', 'COOLDOWN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "JourneyStage" AS ENUM ('LEARN', 'RECALL', 'STRENGTHEN', 'MASTER');

-- CreateEnum
CREATE TYPE "DayLevel" AS ENUM ('GLIMMER', 'GLOW', 'RADIANCE');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('DRAG_DROP', 'PUZZLE', 'SWAP', 'CUE', 'FILL');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BadgeCategory" AS ENUM ('LEARNING', 'STREAK', 'MASTERY', 'INDEPENDENCE', 'SPEED', 'EXPLORATION');

-- CreateEnum
CREATE TYPE "BadgeRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "RewardEventType" AS ENUM ('DAY_COMPLETE', 'BADGE_UNLOCK', 'MANUAL_ADMIN_AWARD');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "suspendReason" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "countryCode" TEXT,
    "totalGlowPoints" INTEGER NOT NULL DEFAULT 0,
    "totalWaypointsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalHintsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredTranslation" "TranslationCode" NOT NULL DEFAULT 'NIV',
    "hasSelectedTranslation" BOOLEAN NOT NULL DEFAULT false,
    "audioEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verse" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseStart" INTEGER NOT NULL,
    "verseEnd" INTEGER,
    "reflection" TEXT,
    "studyNote" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerseTranslation" (
    "id" TEXT NOT NULL,
    "verseId" TEXT NOT NULL,
    "translation" "TranslationCode" NOT NULL,
    "text" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerseTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerseTag" (
    "verseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerseTag_pkey" PRIMARY KEY ("verseId","tagId")
);

-- CreateTable
CREATE TABLE "Pack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackVerse" (
    "packId" TEXT NOT NULL,
    "verseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackVerse_pkey" PRIMARY KEY ("packId","verseId")
);

-- CreateTable
CREATE TABLE "Waypoint" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "verseId" TEXT,
    "journeyStage" "JourneyStage" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Waypoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWaypointProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "waypointId" TEXT NOT NULL,
    "status" "WaypointStatus" NOT NULL DEFAULT 'LOCKED',
    "unlockedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWaypointProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDayProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "waypointId" TEXT NOT NULL,
    "dayLevel" "DayLevel" NOT NULL,
    "status" "CompletionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "unlocksAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "glowPointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDayProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "waypointId" TEXT,
    "verseId" TEXT NOT NULL,
    "dayProgressId" TEXT,
    "dayLevel" "DayLevel",
    "status" "CompletionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "isVaultReplay" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameModeAttempt" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameMode" "GameMode" NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "CompletionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameModeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HintUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "gameMode" "GameMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HintUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "eventType" "RewardEventType" NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "category" "BadgeCategory" NOT NULL,
    "rarity" "BadgeRarity" NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "rewardAmount" INTEGER NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadgeProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "CompletionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBadgeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fellowship" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "inviteCode" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fellowship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FellowshipMember" (
    "id" TEXT NOT NULL,
    "fellowshipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FellowshipMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserShopPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" INTEGER NOT NULL,
    "totalCost" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserShopPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVerseNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verseId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserVerseNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavoriteVerse" (
    "userId" TEXT NOT NULL,
    "verseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteVerse_pkey" PRIMARY KEY ("userId","verseId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_totalWaypointsCompleted_totalGlowPoints_idx" ON "UserProfile"("totalWaypointsCompleted" DESC, "totalGlowPoints" DESC);

-- CreateIndex
CREATE INDEX "UserProfile_totalGlowPoints_idx" ON "UserProfile"("totalGlowPoints" DESC);

-- CreateIndex
CREATE INDEX "UserProfile_countryCode_totalWaypointsCompleted_totalGlowPo_idx" ON "UserProfile"("countryCode", "totalWaypointsCompleted" DESC, "totalGlowPoints" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Verse_reference_key" ON "Verse"("reference");

-- CreateIndex
CREATE INDEX "Verse_book_chapter_verseStart_idx" ON "Verse"("book", "chapter", "verseStart");

-- CreateIndex
CREATE INDEX "Verse_isActive_idx" ON "Verse"("isActive");

-- CreateIndex
CREATE INDEX "VerseTranslation_translation_idx" ON "VerseTranslation"("translation");

-- CreateIndex
CREATE UNIQUE INDEX "VerseTranslation_verseId_translation_key" ON "VerseTranslation"("verseId", "translation");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "VerseTag_tagId_idx" ON "VerseTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Pack_slug_key" ON "Pack"("slug");

-- CreateIndex
CREATE INDEX "Pack_isActive_idx" ON "Pack"("isActive");

-- CreateIndex
CREATE INDEX "PackVerse_verseId_idx" ON "PackVerse"("verseId");

-- CreateIndex
CREATE UNIQUE INDEX "PackVerse_packId_position_key" ON "PackVerse"("packId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Waypoint_number_key" ON "Waypoint"("number");

-- CreateIndex
CREATE INDEX "Waypoint_verseId_journeyStage_idx" ON "Waypoint"("verseId", "journeyStage");

-- CreateIndex
CREATE INDEX "Waypoint_isActive_number_idx" ON "Waypoint"("isActive", "number");

-- CreateIndex
CREATE INDEX "UserWaypointProgress_userId_status_idx" ON "UserWaypointProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "UserWaypointProgress_waypointId_idx" ON "UserWaypointProgress"("waypointId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWaypointProgress_userId_waypointId_key" ON "UserWaypointProgress"("userId", "waypointId");

-- CreateIndex
CREATE INDEX "UserDayProgress_userId_waypointId_idx" ON "UserDayProgress"("userId", "waypointId");

-- CreateIndex
CREATE INDEX "UserDayProgress_userId_status_unlocksAt_idx" ON "UserDayProgress"("userId", "status", "unlocksAt");

-- CreateIndex
CREATE INDEX "UserDayProgress_waypointId_idx" ON "UserDayProgress"("waypointId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDayProgress_userId_waypointId_dayLevel_key" ON "UserDayProgress"("userId", "waypointId", "dayLevel");

-- CreateIndex
CREATE INDEX "GameSession_userId_status_idx" ON "GameSession"("userId", "status");

-- CreateIndex
CREATE INDEX "GameSession_userId_isVaultReplay_createdAt_idx" ON "GameSession"("userId", "isVaultReplay", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GameSession_waypointId_dayLevel_idx" ON "GameSession"("waypointId", "dayLevel");

-- CreateIndex
CREATE INDEX "GameSession_dayProgressId_idx" ON "GameSession"("dayProgressId");

-- CreateIndex
CREATE INDEX "GameModeAttempt_userId_gameMode_status_idx" ON "GameModeAttempt"("userId", "gameMode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GameModeAttempt_gameSessionId_gameMode_attemptNumber_key" ON "GameModeAttempt"("gameSessionId", "gameMode", "attemptNumber");

-- CreateIndex
CREATE INDEX "HintUsage_userId_createdAt_idx" ON "HintUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "HintUsage_gameSessionId_gameMode_idx" ON "HintUsage"("gameSessionId", "gameMode");

-- CreateIndex
CREATE UNIQUE INDEX "RewardLedger_idempotencyKey_key" ON "RewardLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RewardLedger_userId_createdAt_idx" ON "RewardLedger"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RewardLedger_eventType_createdAt_idx" ON "RewardLedger"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserStreak_userId_key" ON "UserStreak"("userId");

-- CreateIndex
CREATE INDEX "UserStreak_currentStreak_idx" ON "UserStreak"("currentStreak" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");

-- CreateIndex
CREATE INDEX "Badge_category_isActive_idx" ON "Badge"("category", "isActive");

-- CreateIndex
CREATE INDEX "UserBadgeProgress_userId_status_idx" ON "UserBadgeProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "UserBadgeProgress_badgeId_status_idx" ON "UserBadgeProgress"("badgeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadgeProgress_userId_badgeId_key" ON "UserBadgeProgress"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "Fellowship_slug_key" ON "Fellowship"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Fellowship_inviteCode_key" ON "Fellowship"("inviteCode");

-- CreateIndex
CREATE INDEX "Fellowship_isPublic_name_idx" ON "Fellowship"("isPublic", "name");

-- CreateIndex
CREATE INDEX "Fellowship_createdById_idx" ON "Fellowship"("createdById");

-- CreateIndex
CREATE INDEX "FellowshipMember_userId_fellowshipId_idx" ON "FellowshipMember"("userId", "fellowshipId");

-- CreateIndex
CREATE INDEX "FellowshipMember_fellowshipId_joinedAt_idx" ON "FellowshipMember"("fellowshipId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FellowshipMember_fellowshipId_userId_key" ON "FellowshipMember"("fellowshipId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopItem_slug_key" ON "ShopItem"("slug");

-- CreateIndex
CREATE INDEX "ShopItem_isActive_itemType_idx" ON "ShopItem"("isActive", "itemType");

-- CreateIndex
CREATE UNIQUE INDEX "UserShopPurchase_idempotencyKey_key" ON "UserShopPurchase"("idempotencyKey");

-- CreateIndex
CREATE INDEX "UserShopPurchase_userId_purchasedAt_idx" ON "UserShopPurchase"("userId", "purchasedAt" DESC);

-- CreateIndex
CREATE INDEX "UserShopPurchase_shopItemId_idx" ON "UserShopPurchase"("shopItemId");

-- CreateIndex
CREATE INDEX "UserVerseNote_verseId_idx" ON "UserVerseNote"("verseId");

-- CreateIndex
CREATE UNIQUE INDEX "UserVerseNote_userId_verseId_key" ON "UserVerseNote"("userId", "verseId");

-- CreateIndex
CREATE INDEX "UserFavoriteVerse_verseId_idx" ON "UserFavoriteVerse"("verseId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE INDEX "user_suspendedAt_idx" ON "user"("suspendedAt");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verse" ADD CONSTRAINT "Verse_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerseTranslation" ADD CONSTRAINT "VerseTranslation_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerseTag" ADD CONSTRAINT "VerseTag_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerseTag" ADD CONSTRAINT "VerseTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackVerse" ADD CONSTRAINT "PackVerse_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackVerse" ADD CONSTRAINT "PackVerse_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Waypoint" ADD CONSTRAINT "Waypoint_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWaypointProgress" ADD CONSTRAINT "UserWaypointProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWaypointProgress" ADD CONSTRAINT "UserWaypointProgress_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "Waypoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDayProgress" ADD CONSTRAINT "UserDayProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDayProgress" ADD CONSTRAINT "UserDayProgress_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "Waypoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "Waypoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_dayProgressId_fkey" FOREIGN KEY ("dayProgressId") REFERENCES "UserDayProgress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameModeAttempt" ADD CONSTRAINT "GameModeAttempt_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameModeAttempt" ADD CONSTRAINT "GameModeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HintUsage" ADD CONSTRAINT "HintUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HintUsage" ADD CONSTRAINT "HintUsage_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStreak" ADD CONSTRAINT "UserStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadgeProgress" ADD CONSTRAINT "UserBadgeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadgeProgress" ADD CONSTRAINT "UserBadgeProgress_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fellowship" ADD CONSTRAINT "Fellowship_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FellowshipMember" ADD CONSTRAINT "FellowshipMember_fellowshipId_fkey" FOREIGN KEY ("fellowshipId") REFERENCES "Fellowship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FellowshipMember" ADD CONSTRAINT "FellowshipMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopItem" ADD CONSTRAINT "ShopItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserShopPurchase" ADD CONSTRAINT "UserShopPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserShopPurchase" ADD CONSTRAINT "UserShopPurchase_shopItemId_fkey" FOREIGN KEY ("shopItemId") REFERENCES "ShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVerseNote" ADD CONSTRAINT "UserVerseNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVerseNote" ADD CONSTRAINT "UserVerseNote_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteVerse" ADD CONSTRAINT "UserFavoriteVerse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteVerse" ADD CONSTRAINT "UserFavoriteVerse_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
