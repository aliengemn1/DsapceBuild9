const http = require('http');

const DSPACE_API = 'http://localhost:8080/server/api';

function httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 80,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(reqOptions, (res) => {
            let data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(data).toString()
                });
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function main() {
    console.log('Testing DSpace login...\n');

    // Step 1: Get CSRF token by making a request to login first (it returns the token even on fail)
    console.log('1. Getting CSRF token via initial request...');
    const initRes = await httpRequest(`${DSPACE_API}/authn/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'user=test&password=test'
    });
    console.log('Init response:', initRes.statusCode);

    let csrfToken = initRes.headers['dspace-xsrf-token'];

    // Check cookies for CSRF
    if (!csrfToken && initRes.headers['set-cookie']) {
        const cookies = Array.isArray(initRes.headers['set-cookie'])
            ? initRes.headers['set-cookie']
            : [initRes.headers['set-cookie']];

        for (const cookie of cookies) {
            const match = cookie.match(/DSPACE-XSRF-COOKIE=([^;]+)/);
            if (match) {
                csrfToken = match[1];
                break;
            }
        }
    }

    console.log('CSRF Token:', csrfToken);

    // Step 2: Try login with catalog1
    console.log('\n2. Attempting login with catalog1@example.com...');
    const loginBody = 'user=catalog1%40example.com&password=123456';

    const loginRes = await httpRequest(`${DSPACE_API}/authn/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
        },
        body: loginBody
    });

    console.log('Login response:', loginRes.statusCode);
    console.log('Authorization header:', loginRes.headers['authorization']);
    if (loginRes.body) console.log('Login body:', loginRes.body);

    // Step 3: Try with ali@ali.com user (existing user)
    console.log('\n3. Trying with existing user ali@ali.com...');

    // Get fresh CSRF token
    const initRes2 = await httpRequest(`${DSPACE_API}/authn/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'user=test&password=test'
    });
    let csrfToken2 = initRes2.headers['dspace-xsrf-token'];
    if (!csrfToken2 && initRes2.headers['set-cookie']) {
        for (const cookie of initRes2.headers['set-cookie']) {
            const match = cookie.match(/DSPACE-XSRF-COOKIE=([^;]+)/);
            if (match) { csrfToken2 = match[1]; break; }
        }
    }

    const loginRes2 = await httpRequest(`${DSPACE_API}/authn/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-XSRF-TOKEN': csrfToken2,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken2}`
        },
        body: 'user=ali%40ali.com&password=admin'
    });

    console.log('Login response:', loginRes2.statusCode);
    console.log('Authorization header:', loginRes2.headers['authorization']);
    if (loginRes2.body) console.log('Login body:', loginRes2.body);
}

main().catch(console.error);
