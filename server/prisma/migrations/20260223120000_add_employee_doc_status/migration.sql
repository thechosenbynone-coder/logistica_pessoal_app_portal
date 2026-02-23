CREATE TABLE "employee_doc_status" (
    "id" TEXT NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "doc_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expires_at" DATE NOT NULL,
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vence_durante_embarque" BOOLEAN,
    "risco_reembarque" BOOLEAN,

    CONSTRAINT "employee_doc_status_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idx_employee_doc_status_employee_doc_type_unique"
ON "employee_doc_status"("employee_id", "doc_type");

CREATE INDEX "idx_employee_doc_status_status"
ON "employee_doc_status"("status");

CREATE INDEX "idx_employee_doc_status_expires_at"
ON "employee_doc_status"("expires_at");

ALTER TABLE "employee_doc_status"
ADD CONSTRAINT "employee_doc_status_employee_id_fkey"
FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
