const { Client } = require('pg');

async function main() {
    const c = new Client({
        host: 'localhost',
        port: 5432,
        database: 'dspace',
        user: 'dspace',
        password: 'dspace'
    });
    await c.connect();

    // Check bitstreams
    const bitstreams = await c.query(`
        SELECT b.uuid, b.name, b.size_bytes
        FROM bitstream b
        ORDER BY b.uuid DESC
        LIMIT 20
    `);
    console.log('Recent bitstreams:');
    bitstreams.rows.forEach(row => {
        console.log(`  ${row.name} - ${row.size_bytes} bytes`);
    });

    // Check workspace items
    const ws = await c.query(`
        SELECT w.workspace_item_id, w.item_id
        FROM workspaceitem w
        ORDER BY w.workspace_item_id DESC
        LIMIT 20
    `);
    console.log('\nWorkspace items:');
    ws.rows.forEach(row => {
        console.log(`  ID: ${row.workspace_item_id}, Item: ${row.item_id}`);
    });

    await c.end();
}

main().catch(console.error);
