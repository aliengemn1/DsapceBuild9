const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'dspace',
        user: 'dspace',
        password: 'dspace'
    });
    await client.connect();

    // Check eperson table structure
    console.log('=== EPerson Table Columns ===');
    const cols = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'eperson'
        ORDER BY ordinal_position
    `);
    cols.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // Get user info
    console.log('\n=== User catalog1@example.com ===');
    const user = await client.query("SELECT * FROM eperson WHERE email = 'catalog1@example.com'");
    if (user.rows.length > 0) {
        const u = user.rows[0];
        console.log('UUID:', u.uuid);
        console.log('Email:', u.email);
        console.log('Password (hash):', u.password ? u.password.substring(0, 30) + '...' : 'NULL');
        console.log('Can Login:', u.can_login);
        console.log('Self Registered:', u.self_registered);
        console.log('Netid:', u.netid);

        // Verify password
        if (u.password) {
            const match = await bcrypt.compare('123456', u.password);
            console.log('\nPassword "123456" matches:', match);
        }
    } else {
        console.log('User not found');
    }

    // Check other users for reference
    console.log('\n=== All Users ===');
    const allUsers = await client.query("SELECT uuid, email, can_login, password IS NOT NULL as has_password FROM eperson");
    allUsers.rows.forEach(u => {
        console.log(`  ${u.email} - can_login: ${u.can_login}, has_password: ${u.has_password}`);
    });

    // Check if there's an existing admin for reference
    console.log('\n=== Admin Group Members ===');
    const adminMembers = await client.query(`
        SELECT e.email
        FROM eperson e
        JOIN epersongroup2eperson eg2e ON e.uuid = eg2e.eperson_id
        JOIN epersongroup eg ON eg.uuid = eg2e.eperson_group_id
        WHERE eg.name = 'Administrator'
    `);
    adminMembers.rows.forEach(m => console.log(`  ${m.email}`));

    await client.end();
}

main().catch(console.error);
