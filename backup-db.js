const { Client } = require('pg');
const fs = require('fs');

async function backupTables() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'dspace',
        user: 'dspace',
        password: 'dspace'
    });

    await client.connect();
    console.log('Connected to database');

    const output = [];
    output.push('-- DSpace Database Backup');
    output.push('-- Generated: ' + new Date().toISOString());
    output.push('');

    // Get all tables
    const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
    `);

    console.log(`Found ${tablesResult.rowCount} tables`);

    for (const row of tablesResult.rows) {
        const tableName = row.table_name;
        console.log(`Backing up table: ${tableName}`);

        // Get row count
        const countResult = await client.query(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
        const rowCount = countResult.rows[0].cnt;

        output.push(`-- Table: ${tableName} (${rowCount} rows)`);

        if (parseInt(rowCount) > 0) {
            // Get data
            const dataResult = await client.query(`SELECT * FROM "${tableName}"`);

            if (dataResult.rows.length > 0) {
                const columns = Object.keys(dataResult.rows[0]);

                for (const dataRow of dataResult.rows) {
                    const values = columns.map(col => {
                        const val = dataRow[col];
                        if (val === null) return 'NULL';
                        if (typeof val === 'number') return val;
                        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                        if (val instanceof Date) return `'${val.toISOString()}'`;
                        return `'${String(val).replace(/'/g, "''")}'`;
                    });
                    output.push(`INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`);
                }
            }
        }
        output.push('');
    }

    await client.end();

    // Write to file
    const backupPath = 'C:\\DspaceBackup\\dspace_db_backup.sql';
    fs.writeFileSync(backupPath, output.join('\n'), 'utf8');
    console.log(`Backup saved to: ${backupPath}`);
    console.log(`File size: ${(fs.statSync(backupPath).size / 1024 / 1024).toFixed(2)} MB`);
}

backupTables().catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
});
