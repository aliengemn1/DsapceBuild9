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

    // Check workspace items
    const ws = await c.query(`
        SELECT w.workspace_item_id, w.item_id
        FROM workspaceitem w
        ORDER BY w.workspace_item_id DESC
        LIMIT 20
    `);
    console.log('Workspace items:', ws.rowCount);
    ws.rows.forEach(row => {
        console.log(`  ID: ${row.workspace_item_id}, Item: ${row.item_id}`);
    });

    // Check bitstreams count
    const bs = await c.query('SELECT COUNT(*) as cnt FROM bitstream');
    console.log('\nTotal bitstreams:', bs.rows[0].cnt);

    // Check bundles
    const bundles = await c.query(`
        SELECT b.uuid, d.text_value as name
        FROM bundle b
        LEFT JOIN metadatavalue d ON d.dspace_object_id = b.uuid
        LEFT JOIN metadatafieldregistry mf ON d.metadata_field_id = mf.metadata_field_id
        WHERE mf.element = 'title' OR mf.element IS NULL
        ORDER BY b.uuid DESC
        LIMIT 10
    `);
    console.log('\nRecent bundles:');
    bundles.rows.forEach(row => {
        console.log(`  ${row.name || 'No name'}`);
    });

    await c.end();
}

main().catch(console.error);
