const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function createUser() {
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

        // Check if catalog1 already exists
        const existingUser = await client.query("SELECT uuid FROM eperson WHERE email = 'catalog1@example.com'");
        if (existingUser.rows.length > 0) {
            console.log('User catalog1@example.com already exists');
            return;
        }

        // Hash password using bcrypt
        const password = '123456';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log('Password hash generated');

        // Generate UUID
        const userUuid = uuidv4();
        console.log(`New user UUID: ${userUuid}`);

        // First, create entry in dspaceobject table (parent table)
        await client.query(`
            INSERT INTO dspaceobject (uuid)
            VALUES ($1)
        `, [userUuid]);
        console.log('Created dspaceobject entry');

        // Now insert user into eperson table
        await client.query(`
            INSERT INTO eperson (uuid, email, password, can_log_in, require_certificate, self_registered, last_active)
            VALUES ($1, $2, $3, true, false, false, NOW())
        `, [userUuid, 'catalog1@example.com', hashedPassword]);
        console.log('User created in eperson table');

        // In DSpace 8/9, names are stored in metadatavalue table
        // Get the metadata field IDs for eperson names
        const firstnameFieldResult = await client.query(`
            SELECT metadata_field_id FROM metadatafieldregistry
            WHERE element = 'firstname' AND qualifier IS NULL
        `);
        const lastnameFieldResult = await client.query(`
            SELECT metadata_field_id FROM metadatafieldregistry
            WHERE element = 'lastname' AND qualifier IS NULL
        `);

        if (firstnameFieldResult.rows.length > 0) {
            await client.query(`
                INSERT INTO metadatavalue (metadata_field_id, dspace_object_id, text_value, place)
                VALUES ($1, $2, 'Catalog', 0)
            `, [firstnameFieldResult.rows[0].metadata_field_id, userUuid]);
            console.log('Added firstname metadata');
        }

        if (lastnameFieldResult.rows.length > 0) {
            await client.query(`
                INSERT INTO metadatavalue (metadata_field_id, dspace_object_id, text_value, place)
                VALUES ($1, $2, 'Admin', 0)
            `, [lastnameFieldResult.rows[0].metadata_field_id, userUuid]);
            console.log('Added lastname metadata');
        }

        // Get Administrator group UUID
        const adminGroupResult = await client.query("SELECT uuid FROM epersongroup WHERE permanent_id = 'Administrator' OR name = 'Administrator'");
        if (adminGroupResult.rows.length > 0) {
            const adminGroupUuid = adminGroupResult.rows[0].uuid;
            console.log(`Administrator group UUID: ${adminGroupUuid}`);

            // Add user to Administrator group
            await client.query(`
                INSERT INTO epersongroup2eperson (eperson_group_id, eperson_id)
                VALUES ($1, $2)
            `, [adminGroupUuid, userUuid]);
            console.log('User added to Administrator group');
        } else {
            console.log('Warning: Administrator group not found');
            // List all groups
            const groupsResult = await client.query("SELECT name, permanent_id FROM epersongroup LIMIT 10");
            console.log('Available groups:');
            groupsResult.rows.forEach(row => console.log(`  - ${row.name} (${row.permanent_id})`));
        }

        console.log('\n=== User catalog1@example.com created successfully ===');
        console.log('Email: catalog1@example.com');
        console.log('Password: 123456');

    } catch (err) {
        console.error('Error:', err.message);
        console.error(err.stack);
    } finally {
        await client.end();
    }
}

createUser();
