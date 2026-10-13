-- The FREE square becomes the center square (M3.1). Postgres updates the CHECK that
-- references the column on rename.
ALTER TABLE "card_square" RENAME COLUMN "is_free" TO "is_center";
