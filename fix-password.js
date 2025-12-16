const { Client } = require('pg');
const crypto = require('crypto');

async function main() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'dspace',
        user: 'dspace',
        password: 'dspace'
    });
    await client.connect();

    const email = 'catalog1@example.com';
    const password = '123456';

    // Generate a random salt (16 bytes, hex encoded = 32 chars)
    const salt = crypto.randomBytes(16).toString('hex');

    // Hash the password with SHA-512 and salt
    // DSpace uses: SHA-512(salt + password)
    const hash = crypto.createHash('sha512')
        .update(salt + password)
        .digest('hex');

    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Salt:', salt);
    console.log('Hash:', hash);

    // Update the user
    await client.query(`
        UPDATE eperson
        SET password = $1,
            salt = $2,
            digest_algorithm = 'SHA-512'
        WHERE email = $3
    `, [hash, salt, email]);

    console.log('\nPassword updated successfully!');

    // Verify
    const result = await client.query(`
        SELECT email, password, salt, digest_algorithm
        FROM eperson WHERE email = $1
    `, [email]);
    console.log('\nVerification:', result.rows[0]);

    await client.end();
}

main().catch(console.error);
