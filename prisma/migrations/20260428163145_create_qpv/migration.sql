-- CreateTable
CREATE TABLE "Qpv" (
    "id" SERIAL NOT NULL,
    "fid" INTEGER NOT NULL,
    "code_qp" TEXT NOT NULL,
    "lib_qp" TEXT NOT NULL,
    "insee_reg" TEXT,
    "lib_reg" TEXT NOT NULL,
    "insee_dep" TEXT NOT NULL,
    "lib_dep" TEXT NOT NULL,
    "insee_com" TEXT NOT NULL,
    "lib_com" TEXT NOT NULL,
    "siren_epci" TEXT NOT NULL,
    "geometry" geometry(MULTIPOLYGON, 4326) NOT NULL,

    CONSTRAINT "Qpv_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Qpv_code_qp_key" ON "Qpv"("code_qp");

-- CreateIndex
CREATE INDEX "Qpv_geometry_idx" ON "Qpv" USING GIST ("geometry");

-- CreateIndex
CREATE INDEX "Qpv_insee_com_idx" ON "Qpv"("insee_com");

-- CreateIndex
CREATE INDEX "Qpv_insee_dep_idx" ON "Qpv"("insee_dep");
