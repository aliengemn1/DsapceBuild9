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

    // Generate a random salt (16 bytes)
    const saltBytes = crypto.randomBytes(16);
    const salt = saltBytes.toString('hex');

    // DSpace hashes as: SHA-512(saltBytes + passwordBytes)
    // The salt in DB is stored as hex string, but the hash is computed using raw bytes
    const hash = crypto.createHash('sha512');
    hash.update(saltBytes);
    hash.update(Buffer.from(password, 'utf-8'));
    const hashHex = hash.digest('hex');

    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Salt (hex):', salt);
    console.log('Hash (hex):', hashHex);
    console.log('Hash length:', hashHex.length);

    // Update the user
    await client.query(`
        UPDATE eperson
        SET password = $1,
            salt = $2,
            digest_algorithm = 'SHA-512'
        WHERE email = $3
    `, [hashHex, salt, email]);

    console.log('\nPassword updated successfully!');

    // Verify by trying to compute hash like DSpace does
    const verify = crypto.createHash('sha512');
    verify.update(Buffer.from(salt, 'hex'));
    verify.update(Buffer.from(password, 'utf-8'));
    console.log('Verify hash:', verify.digest('hex'));
    console.log('Match:', verify.digest('hex') === hashHex);

    await client.end();
}

main().catch(console.error);
