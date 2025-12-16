const { Client } = require('pg');

async function addToAdmin() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'dspace',
        user: 'dspace',
        password: 'dspace'
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL');

        // Get user UUID
        const userResult = await client.query("SELECT uuid FROM eperson WHERE email = 'catalog1@example.com'");
        if (userResult.rows.length === 0) {
            console.log('User not found');
            return;
        }
        const userUuid = userResult.rows[0].uuid;
        console.log(`User UUID: ${userUuid}`);

        // Check epersongroup table structure
        const columnsResult = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'epersongroup' ORDER BY ordinal_position
        `);
        console.log('\nEPersonGroup columns:');
        columnsResult.rows.forEach(row => console.log(`  - ${row.column_name}`));

        // List all groups
        const groupsResult = await client.query("SELECT uuid, eperson_group_id FROM epersongroup");
        console.log('\nAll groups:');

        // Get group names from metadata
        for (const group of groupsResult.rows) {
            const nameResult = await client.query(`
                SELECT text_value FROM metadatavalue mv
                JOIN metadatafieldregistry mf ON mv.metadata_field_id = mf.metadata_field_id
                WHERE dspace_object_id = $1 AND mf.element = 'title'
            `, [group.uuid]);
            const name = nameResult.rows.length > 0 ? nameResult.rows[0].text_value : 'Unknown';
            console.log(`  - ${name} (${group.uuid})`);

            if (name === 'Administrator') {
                console.log(`\nFound Administrator group: ${group.uuid}`);

                // Check if user is already in group
                const memberCheck = await client.query(`
                    SELECT * FROM epersongroup2eperson
                    WHERE eperson_group_id = $1 AND eperson_id = $2
                `, [group.uuid, userUuid]);

                if (memberCheck.rows.length > 0) {
                    console.log('User is already in Administrator group');
                } else {
                    // Add user to Administrator group
                    await client.query(`
                        INSERT INTO epersongroup2eperson (eperson_group_id, eperson_id)
                        VALUES ($1, $2)
                    `, [group.uuid, userUuid]);
                    console.log('User added to Administrator group successfully!');
                }
            }
        }

        console.log('\n=== Done ===');
        console.log('You can now login with:');
        console.log('Email: catalog1@example.com');
        console.log('Password: 123456');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

addToAdmin();
