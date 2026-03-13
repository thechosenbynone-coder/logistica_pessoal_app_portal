-- Add optional deployment linkage for daily reports and service orders
ALTER TABLE "daily_reports"
ADD COLUMN "deployment_id" INTEGER;

ALTER TABLE "service_orders"
ADD COLUMN "deployment_id" INTEGER;

ALTER TABLE "daily_reports"
ADD CONSTRAINT "daily_reports_deployment_id_fkey"
FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_orders"
ADD CONSTRAINT "service_orders_deployment_id_fkey"
FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
