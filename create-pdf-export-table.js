const { Client } = require('pg');

async function createTable() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'dspace',
        user: 'dspace',
        password: 'dspace'
    });

    await client.connect();
    console.log('Connected to database');

    // Create the PDF export requests table
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS pdf_export_request (
            request_id SERIAL PRIMARY KEY,
            item_uuid UUID NOT NULL,
            bitstream_uuid UUID,
            eperson_uuid UUID NOT NULL,
            eperson_email VARCHAR(255) NOT NULL,
            eperson_name VARCHAR(255),
            national_id VARCHAR(50) NOT NULL,
            export_type VARCHAR(20) NOT NULL CHECK (export_type IN ('first_25_percent', 'custom_pages')),
            pages_requested VARCHAR(500),
            total_pages INTEGER,
            pages_exported INTEGER,
            request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
            CONSTRAINT unique_item_user UNIQUE (item_uuid, eperson_uuid)
        );

        -- Create index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_pdf_export_item ON pdf_export_request(item_uuid);
        CREATE INDEX IF NOT EXISTS idx_pdf_export_user ON pdf_export_request(eperson_uuid);
        CREATE INDEX IF NOT EXISTS idx_pdf_export_date ON pdf_export_request(request_date);

        -- Add comments
        COMMENT ON TABLE pdf_export_request IS 'Tracks admin PDF export requests for auditing';
        COMMENT ON COLUMN pdf_export_request.export_type IS 'first_25_percent = first 25% of pages, custom_pages = specific page ranges';
        COMMENT ON COLUMN pdf_export_request.pages_requested IS 'Page range string like "1-5,10,15-20" for custom export';
    `;

    try {
        await client.query(createTableSQL);
        console.log('Table pdf_export_request created successfully');

        // Verify table exists
        const checkResult = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'pdf_export_request'
            ORDER BY ordinal_position
        `);

        console.log('\nTable structure:');
        checkResult.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
        });

    } catch (err) {
        console.error('Error creating table:', err.message);
    }

    await client.end();
}

createTable().catch(console.error);
