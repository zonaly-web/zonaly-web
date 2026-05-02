-- AlterTable
ALTER TABLE "CommuneMetric" ADD COLUMN     "atmoAsOf" TEXT,
ADD COLUMN     "atmoIndiceMoyen" DOUBLE PRECISION,
ADD COLUMN     "atmoJoursMauvais" INTEGER,
ADD COLUMN     "dvfAsOf" TEXT,
ADD COLUMN     "dvfBaseYear" TEXT,
ADD COLUMN     "permitsCount12m" INTEGER,
ADD COLUMN     "permitsLogementsAutorises12m" INTEGER,
ADD COLUMN     "prixMedianM2Eur" DOUBLE PRECISION,
ADD COLUMN     "prixMedianM2EurNMinus5" DOUBLE PRECISION,
ADD COLUMN     "prixMedianM2EvolutionPct" DOUBLE PRECISION,
ADD COLUMN     "sitadelAsOf" TEXT,
ADD COLUMN     "ventesCount" INTEGER;
