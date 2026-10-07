-- Store explicit Map A artwork choices by one-based trail number. A missing
-- row intentionally means that the application should use stable random art.
CREATE TABLE "mapTrailArtwork" (
    "trailNumber" INTEGER NOT NULL,
    "themeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mapTrailArtwork_pkey" PRIMARY KEY ("trailNumber")
);
