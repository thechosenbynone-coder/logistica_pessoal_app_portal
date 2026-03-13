-- CreateTable
CREATE TABLE "tools" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_assignments" (
    "id" SERIAL NOT NULL,
    "tool_id" INTEGER NOT NULL,
    "deployment_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATRIBUIDA',
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returned_at" TIMESTAMPTZ(6),
    "notes" TEXT,

    CONSTRAINT "tool_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tool_assignments_deployment_id_idx" ON "tool_assignments"("deployment_id");

-- CreateIndex
CREATE INDEX "tool_assignments_employee_id_idx" ON "tool_assignments"("employee_id");

-- AddForeignKey
ALTER TABLE "tool_assignments" ADD CONSTRAINT "tool_assignments_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_assignments" ADD CONSTRAINT "tool_assignments_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_assignments" ADD CONSTRAINT "tool_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
