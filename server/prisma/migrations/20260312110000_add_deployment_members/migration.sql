CREATE TABLE "deployment_members" (
  "id" SERIAL NOT NULL,
  "deployment_id" INTEGER NOT NULL,
  "employee_id" INTEGER NOT NULL,
  "gate_status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "gate_notes" TEXT,
  "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "deployment_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deployment_members_deployment_id_employee_id_key"
  ON "deployment_members"("deployment_id", "employee_id");

CREATE INDEX "deployment_members_deployment_id_idx"
  ON "deployment_members"("deployment_id");

CREATE INDEX "deployment_members_employee_id_idx"
  ON "deployment_members"("employee_id");

ALTER TABLE "deployment_members"
  ADD CONSTRAINT "deployment_members_deployment_id_fkey"
  FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deployment_members"
  ADD CONSTRAINT "deployment_members_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
