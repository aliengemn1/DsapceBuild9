--
-- The contents of this file are subject to the license and copyright
-- detailed in the LICENSE and NOTICE files at the root of the source
-- tree and available online at
--
-- http://www.dspace.org/license/
--

--
-- Create table for Admin PDF Export Request tracking
--
CREATE TABLE IF NOT EXISTS pdf_export_request (
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

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pdf_export_request_eperson ON pdf_export_request(eperson_uuid);
CREATE INDEX IF NOT EXISTS idx_pdf_export_request_item ON pdf_export_request(item_uuid);
CREATE INDEX IF NOT EXISTS idx_pdf_export_request_bitstream ON pdf_export_request(bitstream_uuid);
CREATE INDEX IF NOT EXISTS idx_pdf_export_request_date ON pdf_export_request(request_date);
CREATE INDEX IF NOT EXISTS idx_pdf_export_request_national_id ON pdf_export_request(national_id);

-- Add comment to table
COMMENT ON TABLE pdf_export_request IS 'Tracks all admin PDF export requests for auditing purposes';
