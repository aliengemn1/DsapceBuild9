-- Fix PDF Export Request table for DSpace
DROP TABLE IF EXISTS pdf_export_request CASCADE;

CREATE TABLE pdf_export_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(50) NOT NULL UNIQUE,
    item_uuid UUID NOT NULL,
    bitstream_uuid UUID NOT NULL,
    eperson_uuid UUID NOT NULL,
    eperson_name VARCHAR(255) NOT NULL,
    national_id VARCHAR(20) NOT NULL,
    export_type VARCHAR(20) NOT NULL,
    pages_requested VARCHAR(500),
    pages_exported INTEGER,
    total_pages INTEGER,
    request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    item_title VARCHAR(500),
    bitstream_name VARCHAR(255)
);

CREATE INDEX idx_pdf_export_request_eperson ON pdf_export_request(eperson_uuid);
CREATE INDEX idx_pdf_export_request_item ON pdf_export_request(item_uuid);
CREATE INDEX idx_pdf_export_request_bitstream ON pdf_export_request(bitstream_uuid);
CREATE INDEX idx_pdf_export_request_date ON pdf_export_request(request_date);
CREATE INDEX idx_pdf_export_request_national_id ON pdf_export_request(national_id);

COMMENT ON TABLE pdf_export_request IS 'Tracks all admin PDF export requests for auditing purposes';
