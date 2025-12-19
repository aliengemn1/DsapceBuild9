@echo off
set PGPASSWORD=dspace
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -U dspace -d dspace -c "DROP TABLE IF EXISTS pdf_export_request CASCADE;"
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -U dspace -d dspace -c "CREATE TABLE pdf_export_request (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), request_id VARCHAR(50) NOT NULL UNIQUE, item_uuid UUID NOT NULL, bitstream_uuid UUID NOT NULL, eperson_uuid UUID NOT NULL, eperson_name VARCHAR(255) NOT NULL, national_id VARCHAR(20) NOT NULL, export_type VARCHAR(20) NOT NULL, pages_requested VARCHAR(500), pages_exported INTEGER, total_pages INTEGER, request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, ip_address VARCHAR(45), item_title VARCHAR(500), bitstream_name VARCHAR(255));"
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -U dspace -d dspace -c "CREATE INDEX idx_pdf_export_eperson ON pdf_export_request(eperson_uuid);"
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -U dspace -d dspace -c "CREATE INDEX idx_pdf_export_item ON pdf_export_request(item_uuid);"
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -U dspace -d dspace -c "CREATE INDEX idx_pdf_export_date ON pdf_export_request(request_date);"
echo Done creating pdf_export_request table
