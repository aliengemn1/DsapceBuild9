const { Client } = require('pg');

async function main() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'dspace',
        user: 'dspace',
        password: 'dspace'
    });
    await client.connect();

    // Check group names directly from epersongroup.name column
    const groups = await client.query('SELECT uuid, name FROM epersongroup');
    console.log('Groups with name column:');
    groups.rows.forEach(g => console.log('  -', g.name, ':', g.uuid));

    // Find Administrator group
    const adminGroup = groups.rows.find(g => g.name === 'Administrator');
    if (adminGroup) {
        console.log('\nAdministrator group found:', adminGroup.uuid);

        // Get user UUID
        const userResult = await client.query("SELECT uuid FROM eperson WHERE email = 'catalog1@example.com'");
        if (userResult.rows.length === 0) {
            console.log('User not found');
            await client.end();
            return;
        }
        const userUuid = userResult.rows[0].uuid;
        console.log('User UUID:', userUuid);

        // Check if user is already in group
        const memberCheck = await client.query(
            'SELECT * FROM epersongroup2eperson WHERE eperson_group_id = $1 AND eperson_id = $2',
            [adminGroup.uuid, userUuid]
        );

        if (memberCheck.rows.length > 0) {
            console.log('User is already in Administrator group');
        } else {
            // Add user to Administrator group
            await client.query(
                'INSERT INTO epersongroup2eperson (eperson_group_id, eperson_id) VALUES ($1, $2)',
                [adminGroup.uuid, userUuid]
            );
            console.log('User added to Administrator group successfully!');
        }
    } else {
        console.log('\nNo Administrator group found by name');
    }

    await client.end();
}

main().catch(console.error);
