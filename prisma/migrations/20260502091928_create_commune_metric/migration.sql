-- CreateTable
CREATE TABLE "CommuneMetric" (
    "codeInsee" TEXT NOT NULL,
    "libelle" TEXT,
    "isArm" BOOLEAN NOT NULL DEFAULT false,
    "masterCodeInsee" TEXT,
    "departement" TEXT,
    "revenuMedianEurUce" DOUBLE PRECISION,
    "filosofiAsOf" TEXT,
    "partLocataires" DOUBLE PRECISION,
    "partProprietaires" DOUBLE PRECISION,
    "rpLogementAsOf" TEXT,
    "radonClasse" TEXT,
    "radonAsOf" TEXT,
    "cambriolagesPer1000Logements" DOUBLE PRECISION,
    "agressionsPer1000Habitants" DOUBLE PRECISION,
    "ssmsiAsOf" TEXT,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommuneMetric_pkey" PRIMARY KEY ("codeInsee")
);

-- CreateIndex
CREATE INDEX "CommuneMetric_departement_idx" ON "CommuneMetric"("departement");

-- CreateIndex
CREATE INDEX "CommuneMetric_isArm_idx" ON "CommuneMetric"("isArm");

