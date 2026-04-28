-- CreateTable
CREATE TABLE "Qrr" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "dep" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "vague" DOUBLE PRECISION NOT NULL,
    "code_qrr" TEXT NOT NULL,
    "geometry" geometry(MULTIPOLYGON, 4326) NOT NULL,

    CONSTRAINT "Qrr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Qrr_code_qrr_key" ON "Qrr"("code_qrr");

-- CreateIndex
CREATE INDEX "Qrr_geometry_idx" ON "Qrr" USING GIST ("geometry");

-- CreateIndex
CREATE INDEX "Qrr_dep_idx" ON "Qrr"("dep");
