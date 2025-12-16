const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Disable SSL verification for KFNL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DSPACE_API = 'http://localhost:8080/server/api';
let authToken = null;
let csrfToken = null;

// Helper function to make HTTP requests
function httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https');
        const lib = isHttps ? https : http;

        const urlObj = new URL(url);
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            rejectUnauthorized: false
        };

        const req = lib.request(reqOptions, (res) => {
            let data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => {
                const body = Buffer.concat(data);
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
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

// Get CSRF token by making a dummy request
async function getCsrfToken() {
    // Make a dummy login request to get the CSRF token
    const initRes = await httpRequest(`${DSPACE_API}/authn/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'user=test&password=test'
    });

    // Try to get CSRF token from header
    csrfToken = initRes.headers['dspace-xsrf-token'];

    // If not in header, check Set-Cookie
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

    return csrfToken;
}

// Login to DSpace
async function loginToDSpace(email, password) {
    console.log('Logging into DSpace...');
    await getCsrfToken();

    const loginRes = await httpRequest(`${DSPACE_API}/authn/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
        },
        body: `user=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
    });

    if (loginRes.statusCode === 200) {
        authToken = loginRes.headers['authorization'];
        console.log('Login successful!');
        return true;
    } else {
        console.log(`Login failed: ${loginRes.statusCode}`);
        return false;
    }
}

// Get all communities
async function getCommunities() {
    await getCsrfToken();
    const res = await httpRequest(`${DSPACE_API}/core/communities?size=100`, {
        headers: {
            'Accept': 'application/json',
            'Authorization': authToken
        }
    });
    const data = JSON.parse(res.body.toString());
    return data._embedded?.communities || [];
}

// Get all collections
async function getCollections() {
    await getCsrfToken();
    const res = await httpRequest(`${DSPACE_API}/core/collections?size=100`, {
        headers: {
            'Accept': 'application/json',
            'Authorization': authToken
        }
    });
    const data = JSON.parse(res.body.toString());
    return data._embedded?.collections || [];
}

// Create a community
async function createCommunity(name, description) {
    console.log(`Creating community: ${name}`);
    await getCsrfToken();

    const res = await httpRequest(`${DSPACE_API}/core/communities`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authToken,
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
        },
        body: JSON.stringify({
            name: name,
            metadata: {
                'dc.title': [{ value: name, language: 'ar' }],
                'dc.description': [{ value: description || '', language: 'ar' }]
            }
        })
    });

    if (res.statusCode === 201) {
        const community = JSON.parse(res.body.toString());
        console.log(`Community created: ${community.uuid}`);
        return community;
    } else {
        console.log(`Failed to create community: ${res.statusCode}`);
        console.log(res.body.toString());
        return null;
    }
}

// Create a collection in a community
async function createCollection(communityId, name, description) {
    console.log(`Creating collection: ${name} in community ${communityId}`);
    await getCsrfToken();

    const res = await httpRequest(`${DSPACE_API}/core/collections?parent=${communityId}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authToken,
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
        },
        body: JSON.stringify({
            name: name,
            metadata: {
                'dc.title': [{ value: name, language: 'ar' }],
                'dc.description': [{ value: description || '', language: 'ar' }]
            }
        })
    });

    if (res.statusCode === 201) {
        const collection = JSON.parse(res.body.toString());
        console.log(`Collection created: ${collection.uuid}`);
        return collection;
    } else {
        console.log(`Failed to create collection: ${res.statusCode}`);
        console.log(res.body.toString());
        return null;
    }
}

// Create a workspace item
async function createWorkspaceItem(collectionId) {
    await getCsrfToken();
    const res = await httpRequest(`${DSPACE_API}/submission/workspaceitems?owningCollection=${collectionId}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authToken,
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
        },
        body: '{}'
    });

    if (res.statusCode === 201) {
        const wsItem = JSON.parse(res.body.toString());
        console.log('  Workspace item created:', wsItem.id);
        return wsItem;
    }
    console.log(`Failed to create workspace item: ${res.statusCode}`);
    console.log(res.body.toString());
    return null;
}

// Update item metadata
async function updateItemMetadata(itemId, metadata) {
    await getCsrfToken();

    const operations = [];
    for (const [key, value] of Object.entries(metadata)) {
        if (value) {
            operations.push({
                op: 'add',
                path: `/metadata/${key}`,
                value: [{ value: value, language: key.includes('title') || key.includes('description') ? 'ar' : null }]
            });
        }
    }

    if (operations.length === 0) return true;

    const res = await httpRequest(`${DSPACE_API}/core/items/${itemId}`, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authToken,
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
        },
        body: JSON.stringify(operations)
    });

    return res.statusCode === 200;
}

// Upload a bitstream to an item
async function uploadBitstream(itemId, filePath, fileName, bundleName = 'ORIGINAL') {
    console.log(`  Uploading bitstream: ${fileName}`);
    await getCsrfToken();

    // Read file
    const fileContent = fs.readFileSync(filePath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    // Build multipart body
    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += 'Content-Type: application/octet-stream\r\n\r\n';

    const bodyStart = Buffer.from(body, 'utf-8');
    const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const fullBody = Buffer.concat([bodyStart, fileContent, bodyEnd]);

    // First, get or create the bundle
    const bundleRes = await httpRequest(`${DSPACE_API}/core/items/${itemId}/bundles?name=${bundleName}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authToken,
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
        },
        body: JSON.stringify({ name: bundleName, metadata: {} })
    });

    let bundleId;
    if (bundleRes.statusCode === 201) {
        const bundle = JSON.parse(bundleRes.body.toString());
        bundleId = bundle.uuid;
    } else {
        // Bundle might exist, get it
        const getBundleRes = await httpRequest(`${DSPACE_API}/core/items/${itemId}/bundles`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': authToken
            }
        });
        const bundles = JSON.parse(getBundleRes.body.toString());
        const existingBundle = bundles._embedded?.bundles?.find(b => b.name === bundleName);
        if (existingBundle) {
            bundleId = existingBundle.uuid;
        } else {
            console.log(`  Failed to get bundle`);
            return false;
        }
    }

    // Upload to bundle
    const uploadRes = await httpRequest(`${DSPACE_API}/core/bundles/${bundleId}/bitstreams`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Authorization': authToken,
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
        },
        body: fullBody
    });

    if (uploadRes.statusCode === 201) {
        console.log(`  Bitstream uploaded successfully`);
        return true;
    } else {
        console.log(`  Failed to upload bitstream: ${uploadRes.statusCode}`);
        return false;
    }
}

// Submit workspace item (make it a real item)
async function submitWorkspaceItem(workspaceItemId) {
    await getCsrfToken();
    const res = await httpRequest(`${DSPACE_API}/workflow/workflowitems`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'text/uri-list',
            'Authorization': authToken,
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
        },
        body: `${DSPACE_API}/submission/workspaceitems/${workspaceItemId}`
    });
    return res.statusCode === 201 || res.statusCode === 200;
}

// Import a book
async function importBook(collectionId, book) {
    console.log(`\nImporting book: ${book.title || book.id}`);

    // Create workspace item
    const wsItem = await createWorkspaceItem(collectionId);
    if (!wsItem) return false;

    // Try to get item ID from different possible structures
    let itemId;
    if (wsItem._embedded && wsItem._embedded.item) {
        itemId = wsItem._embedded.item.uuid;
    } else if (wsItem.item) {
        itemId = wsItem.item.uuid;
    } else if (wsItem._links && wsItem._links.item) {
        // Need to fetch the item from the link
        console.log('  Fetching item details...');
        const itemRes = await httpRequest(wsItem._links.item.href, {
            headers: { 'Accept': 'application/json', 'Authorization': authToken }
        });
        if (itemRes.statusCode === 200) {
            const item = JSON.parse(itemRes.body.toString());
            itemId = item.uuid;
        }
    }

    if (!itemId) {
        console.log('  Could not get item ID from workspace item');
        console.log('  Structure:', JSON.stringify(wsItem, null, 2));
        return false;
    }
    console.log('  Item ID:', itemId);

    // Update metadata
    await updateItemMetadata(itemId, {
        'dc.title': book.title || `كتاب ${book.id}`,
        'dc.source': 'مكتبة الملك فهد الوطنية (KFNL)',
        'dc.type': 'Book',
        'dc.identifier.uri': book.detailUrl
    });

    // Upload cover image as thumbnail
    if (book.localPath && fs.existsSync(book.localPath)) {
        await uploadBitstream(itemId, book.localPath, path.basename(book.localPath), 'THUMBNAIL');
    }

    // Submit
    const submitted = await submitWorkspaceItem(wsItem.id);
    console.log(`  Submission: ${submitted ? 'success' : 'failed'}`);

    return submitted;
}

// Import a video
async function importVideo(collectionId, video) {
    console.log(`\nImporting video: ${video.title}`);

    // Create workspace item
    const wsItem = await createWorkspaceItem(collectionId);
    if (!wsItem) return false;

    // Try to get item ID from different possible structures
    let itemId;
    if (wsItem._embedded && wsItem._embedded.item) {
        itemId = wsItem._embedded.item.uuid;
    } else if (wsItem.item) {
        itemId = wsItem.item.uuid;
    } else if (wsItem._links && wsItem._links.item) {
        const itemRes = await httpRequest(wsItem._links.item.href, {
            headers: { 'Accept': 'application/json', 'Authorization': authToken }
        });
        if (itemRes.statusCode === 200) {
            const item = JSON.parse(itemRes.body.toString());
            itemId = item.uuid;
        }
    }

    if (!itemId) {
        console.log('  Could not get item ID');
        return false;
    }
    console.log('  Item ID:', itemId);

    // Update metadata
    await updateItemMetadata(itemId, {
        'dc.title': video.title,
        'dc.source': 'مكتبة الملك فهد الوطنية (KFNL)',
        'dc.type': 'Video',
        'dc.identifier.uri': video.url
    });

    // Submit
    const submitted = await submitWorkspaceItem(wsItem.id);
    console.log(`  Submission: ${submitted ? 'success' : 'failed'}`);

    return submitted;
}

// Main function
async function main() {
    console.log('===========================================');
    console.log('  DSpace Import from KFNL');
    console.log('===========================================\n');

    // Try to login
    const loggedIn = await loginToDSpace('ali@ali.com', 'admin');
    if (!loggedIn) {
        console.log('Could not login. Please check credentials.');
        console.log('Creating items without authentication (will require manual approval)...\n');
    }

    // Get existing communities
    const communities = await getCommunities();
    console.log(`Found ${communities.length} communities`);

    // Look for or create KFNL community
    let kfnlCommunity = communities.find(c =>
        c.name?.includes('KFNL') ||
        c.name?.includes('مكتبة الملك فهد') ||
        c.name?.includes('King Fahd')
    );

    if (!kfnlCommunity) {
        kfnlCommunity = await createCommunity(
            'مكتبة الملك فهد الوطنية',
            'محتوى من مكتبة الملك فهد الوطنية'
        );
    }

    if (!kfnlCommunity) {
        console.log('Could not find or create KFNL community');
        console.log('\nPlease create communities and collections manually in DSpace first.');
        return;
    }

    // Get existing collections
    const collections = await getCollections();
    console.log(`Found ${collections.length} collections`);

    // Look for or create books collection
    let booksCollection = collections.find(c =>
        c.name?.includes('كتب') ||
        c.name?.includes('Books') ||
        c.name?.includes('Arabic Books')
    );

    if (!booksCollection) {
        booksCollection = await createCollection(
            kfnlCommunity.uuid,
            'الكتب العربية',
            'الكتب المقتناة حديثاً من مكتبة الملك فهد الوطنية'
        );
    }

    // Look for or create videos collection
    let videosCollection = collections.find(c =>
        c.name?.includes('فيديو') ||
        c.name?.includes('Video')
    );

    if (!videosCollection) {
        videosCollection = await createCollection(
            kfnlCommunity.uuid,
            'مقاطع الفيديو',
            'مقاطع فيديو من مكتبة الملك فهد الوطنية'
        );
    }

    // Load parsed data
    const downloadDir = 'C:\\DsapceBuild9\\kfnl_downloads';
    const books = JSON.parse(fs.readFileSync(path.join(downloadDir, 'books.json'), 'utf-8'));
    const videos = JSON.parse(fs.readFileSync(path.join(downloadDir, 'videos.json'), 'utf-8'));

    console.log(`\n--- Importing ${books.length} Books ---`);
    if (booksCollection) {
        // Assign titles from the main page data
        const bookTitles = [
            'النبي حاكم الدولة',
            'صحافة نجد',
            'الوراقين'
        ];

        for (let i = 0; i < books.length; i++) {
            books[i].title = bookTitles[i] || `كتاب ${books[i].id}`;
            await importBook(booksCollection.uuid, books[i]);
        }
    }

    console.log(`\n--- Importing ${Math.min(videos.length, 10)} Videos (first 10) ---`);
    if (videosCollection) {
        for (let i = 0; i < Math.min(videos.length, 10); i++) {
            await importVideo(videosCollection.uuid, videos[i]);
        }
    }

    console.log('\n===========================================');
    console.log('  Import Complete!');
    console.log('===========================================');
}

main().catch(console.error);
