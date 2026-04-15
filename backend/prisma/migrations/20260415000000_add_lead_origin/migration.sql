-- CreateTable
CREATE TABLE "lead_origins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_origins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_origins_name_key" ON "lead_origins"("name");

-- AlterTable
ALTER TABLE "deals" ADD COLUMN "origin_id" TEXT;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_origin_id_fkey" FOREIGN KEY ("origin_id") REFERENCES "lead_origins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
