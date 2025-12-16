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

    const r = await c.query('SELECT uuid, email, password, digest_algorithm, salt FROM eperson');
    console.log('All users:');
    r.rows.forEach(u => {
        console.log(u.email, '- algo:', u.digest_algorithm, '- has_pwd:', !!u.password, '- has_salt:', !!u.salt);
        if (u.password) {
            console.log('  Password prefix:', u.password.substring(0, 15));
        }
    });

    await c.end();
}

main().catch(console.error);
