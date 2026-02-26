-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('PLANEJADO', 'CONFIRMADO', 'DOCS_OK', 'EMBARCADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EpiDeliveryStatus" AS ENUM ('EMITIDO', 'AGUARDANDO_ASSINATURA', 'ASSINADO', 'DEVOLVIDO', 'PARCIAL');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDENTE', 'EM_REVISAO', 'APROVADO', 'REJEITADO', 'CORRECAO_SOLICITADA');

-- AlterTable
ALTER TABLE "deployments"
ADD COLUMN "status" "DeploymentStatus" NOT NULL DEFAULT 'PLANEJADO',
ADD COLUMN "transport_type" TEXT,
ADD COLUMN "departure_hub" TEXT;

-- AlterTable
ALTER TABLE "epi_deliveries"
ADD COLUMN "status" "EpiDeliveryStatus" NOT NULL DEFAULT 'EMITIDO',
ADD COLUMN "location" TEXT,
ADD COLUMN "responsible" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "returned_at" TIMESTAMPTZ(6),
ADD COLUMN "returned_qty" INTEGER,
ADD COLUMN "returned_notes" TEXT;

-- AlterTable
ALTER TABLE "daily_reports"
ADD COLUMN "reviewed_by" TEXT,
ADD COLUMN "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN "rejection_reason" TEXT;

-- AlterTable
ALTER TABLE "service_orders"
ADD COLUMN "reviewed_by" TEXT,
ADD COLUMN "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN "rejection_reason" TEXT;

-- CreateTable
CREATE TABLE "epi_function_requirements" (
    "id" SERIAL NOT NULL,
    "role" TEXT NOT NULL,
    "epi_item_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "epi_function_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_tickets" (
    "id" SERIAL NOT NULL,
    "deployment_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "locator" TEXT,
    "departure" TIMESTAMPTZ(6),
    "arrival" TIMESTAMPTZ(6),
    "origin" TEXT,
    "destination" TEXT,
    "file_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "deployment_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "epi_function_requirements_role_epi_item_id_key" ON "epi_function_requirements"("role", "epi_item_id");

-- CreateIndex
CREATE INDEX "deployment_tickets_deployment_id_idx" ON "deployment_tickets"("deployment_id");

-- AddForeignKey
ALTER TABLE "epi_function_requirements" ADD CONSTRAINT "epi_function_requirements_epi_item_id_fkey" FOREIGN KEY ("epi_item_id") REFERENCES "epi_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_tickets" ADD CONSTRAINT "deployment_tickets_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
