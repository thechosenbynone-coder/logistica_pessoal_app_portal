-- CreateTable
CREATE TABLE "accommodations" (
    "id" SERIAL NOT NULL,
    "deployment_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'HOTEL',
    "provider_name" TEXT,
    "check_in" DATE,
    "check_out" DATE,
    "address" TEXT,
    "confirmation_code" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accommodations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accommodations_deployment_id_idx" ON "accommodations"("deployment_id");

-- CreateIndex
CREATE INDEX "accommodations_employee_id_idx" ON "accommodations"("employee_id");

-- AddForeignKey
ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_deployment_id_fkey"
  FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
