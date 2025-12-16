const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DSPACE_API = 'http://localhost:8080/server/api';
const DOWNLOAD_DIR = 'C:\\DsapceBuild9\\kfnl_downloads';

let authToken = null;
let csrfToken = null;

// Video metadata with Arabic titles
const VIDEOS = [
    { url: 'https://kfnl.gov.sa/Ar/mediacenter/DocLib1/01.mp4', title: 'فيديو مكتبة الملك فهد الوطنية 01', description: 'فيديو من المركز الإعلامي لمكتبة الملك فهد الوطنية' },
    { url: 'https://kfnl.gov.sa/Ar/mediacenter/DocLib1/02.mp4', title: 'فيديو مكتبة الملك فهد الوطنية 02', description: 'فيديو من المركز الإعلامي لمكتبة الملك فهد الوطنية' },
    { url: 'https://kfnl.gov.sa/Ar/mediacenter/DocLib1/1.mp4', title: 'فيديو مكتبة الملك فهد الوطنية 1', description: 'فيديو من المركز الإعلامي لمكتبة الملك فهد الوطنية' },
    { url: 'https://kfnl.gov.sa/Ar/mediacenter/DocLib1/2.mp4', title: 'فيديو مكتبة الملك فهد الوطنية 2', description: 'فيديو من المركز الإعلامي لمكتبة الملك فهد الوطنية' },
    { url: 'https://kfnl.gov.sa/Ar/mediacenter/DocLib1/3.mp4', title: 'فيديو مكتبة الملك فهد الوطنية 3', description: 'فيديو من المركز الإعلامي لمكتبة الملك فهد الوطنية' },
];

// Books from RecentlyShelvedBooks page with full Dublin Core metadata
const BOOKS = [
    {
        id: '142',
        imageUrl: 'https://kfnl.gov.sa/Ar/RecentlyShelvedBooks/PublishingImages/204579564.jpg',
        title: 'كتاب من مكتبة الملك فهد الوطنية - 142',
        author: 'مكتبة الملك فهد الوطنية',
        publisher: 'مكتبة الملك فهد الوطنية',
        date: '2024',
        language: 'ar',
        subject: 'الكتب العربية',
        source: 'https://kfnl.gov.sa/Ar/RecentlyShelvedBooks/Pages/ViewRecentlyShelvedBooks.aspx?rsbid=142'
    },
    {
        id: '141',
        imageUrl: 'https://kfnl.gov.sa/Ar/RecentlyShelvedBooks/PublishingImages/204578949.jpg',
        title: 'كتاب من مكتبة الملك فهد الوطنية - 141',
        author: 'مكتبة الملك فهد الوطنية',
        publisher: 'مكتبة الملك فهد الوطنية',
        date: '2024',
        language: 'ar',
        subject: 'الكتب العربية',
        source: 'https://kfnl.gov.sa/Ar/RecentlyShelvedBooks/Pages/ViewRecentlyShelvedBooks.aspx?rsbid=141'
    },
    {
        id: '139',
        imageUrl: 'https://kfnl.gov.sa/Ar/RecentlyShelvedBooks/PublishingImages/204578926.jpg',
        title: 'كتاب من مكتبة الملك فهد الوطنية - 139',
        author: 'مكتبة الملك فهد الوطنية',
        publisher: 'مكتبة الملك فهد الوطنية',
        date: '2024',
        language: 'ar',
        subject: 'الكتب العربية',
        source: 'https://kfnl.gov.sa/Ar/RecentlyShelvedBooks/Pages/ViewRecentlyShelvedBooks.aspx?rsbid=139'
    }
];

function httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const lib = isHttps ? https : http;

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
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(data)
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

async function downloadFile(url, localPath) {
    console.log(`Downloading: ${url}`);
    const response = await httpRequest(url);

    if (response.statusCode === 200) {
        fs.writeFileSync(localPath, response.body);
        console.log(`  Saved to: ${localPath} (${response.body.length} bytes)`);
        return true;
    } else {
        console.log(`  Failed: HTTP ${response.statusCode}`);
        return false;
    }
}

// Get fresh CSRF token before each API call
async function getCsrfToken() {
    const res = await httpRequest(`${DSPACE_API}/authn/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'user=test&password=test'
    });

    csrfToken = res.headers['dspace-xsrf-token'];

    if (!csrfToken && res.headers['set-cookie']) {
        const cookieArr = Array.isArray(res.headers['set-cookie'])
            ? res.headers['set-cookie']
            : [res.headers['set-cookie']];
        for (const cookie of cookieArr) {
            const match = cookie.match(/DSPACE-XSRF-COOKIE=([^;]+)/);
            if (match) {
                csrfToken = match[1];
                break;
            }
        }
    }

    return csrfToken;
}

async function loginToDSpace(email, password) {
    console.log(`Logging in as ${email}...`);
    await getCsrfToken();

    const res = await httpRequest(`${DSPACE_API}/authn/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
        },
        body: `user=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
    });

    if (res.headers['authorization']) {
        authToken = res.headers['authorization'];
        console.log(`  Login successful!`);
        return true;
    }

    console.log(`  Login failed: ${res.statusCode}`);
    return false;
}

async function getCollections() {
    await getCsrfToken();
    const res = await httpRequest(`${DSPACE_API}/core/collections?size=100`, {
        headers: {
            'Authorization': authToken,
            'Accept': 'application/json'
        }
    });

    const data = JSON.parse(res.body.toString());
    return data._embedded?.collections || [];
}

async function createWorkspaceItem(collectionId) {
    console.log(`Creating workspace item...`);
    await getCsrfToken();

    const res = await httpRequest(`${DSPACE_API}/submission/workspaceitems?owningCollection=${collectionId}`, {
        method: 'POST',
        headers: {
            'Authorization': authToken,
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });

    if (res.statusCode === 201) {
        const wsItem = JSON.parse(res.body.toString());
        console.log(`  Created workspace item: ${wsItem.id}`);
        return wsItem;
    }

    console.log(`  Failed: ${res.statusCode}`);
    return null;
}

async function updateItemMetadata(wsItemId, metadata) {
    console.log(`Updating metadata...`);
    await getCsrfToken();

    // Build patch operations for Dublin Core metadata
    const patchOps = [];

    if (metadata.title) {
        patchOps.push({
            op: 'add',
            path: '/sections/traditionalpageone/dc.title',
            value: [{ value: metadata.title }]
        });
    }
    if (metadata.author) {
        patchOps.push({
            op: 'add',
            path: '/sections/traditionalpageone/dc.contributor.author',
            value: [{ value: metadata.author }]
        });
    }
    if (metadata.date) {
        patchOps.push({
            op: 'add',
            path: '/sections/traditionalpageone/dc.date.issued',
            value: [{ value: metadata.date }]
        });
    }
    if (metadata.publisher) {
        patchOps.push({
            op: 'add',
            path: '/sections/traditionalpagetwo/dc.publisher',
            value: [{ value: metadata.publisher }]
        });
    }
    if (metadata.description) {
        patchOps.push({
            op: 'add',
            path: '/sections/traditionalpagetwo/dc.description',
            value: [{ value: metadata.description }]
        });
    }
    if (metadata.subject) {
        patchOps.push({
            op: 'add',
            path: '/sections/traditionalpagetwo/dc.subject',
            value: [{ value: metadata.subject }]
        });
    }
    if (metadata.language) {
        patchOps.push({
            op: 'add',
            path: '/sections/traditionalpagetwo/dc.language.iso',
            value: [{ value: metadata.language }]
        });
    }
    if (metadata.source) {
        patchOps.push({
            op: 'add',
            path: '/sections/traditionalpagetwo/dc.source',
            value: [{ value: metadata.source }]
        });
    }
    if (metadata.type) {
        patchOps.push({
            op: 'add',
            path: '/sections/traditionalpagetwo/dc.type',
            value: [{ value: metadata.type }]
        });
    }
    if (metadata.rights) {
        patchOps.push({
            op: 'add',
            path: '/sections/traditionalpagetwo/dc.rights',
            value: [{ value: metadata.rights }]
        });
    }

    const res = await httpRequest(`${DSPACE_API}/submission/workspaceitems/${wsItemId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': authToken,
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patchOps)
    });

    if (res.statusCode === 200) {
        console.log(`  Metadata updated`);
        return true;
    }

    console.log(`  Metadata update failed: ${res.statusCode}`);
    return false;
}

async function uploadBitstream(wsItemId, filePath, fileName) {
    console.log(`Uploading file: ${fileName}...`);
    await getCsrfToken();

    const fileContent = fs.readFileSync(filePath);
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

    let bodyParts = [];
    bodyParts.push(Buffer.from(`--${boundary}\r\n`));
    bodyParts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`));
    bodyParts.push(Buffer.from(`Content-Type: application/octet-stream\r\n\r\n`));
    bodyParts.push(fileContent);
    bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const fullBody = Buffer.concat(bodyParts);

    const res = await httpRequest(`${DSPACE_API}/submission/workspaceitems/${wsItemId}`, {
        method: 'POST',
        headers: {
            'Authorization': authToken,
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: fullBody
    });

    console.log(`  Upload result: ${res.statusCode}`);
    return res.statusCode === 200 || res.statusCode === 201;
}

async function submitWorkflowItem(wsItemId) {
    console.log(`Submitting to workflow...`);
    await getCsrfToken();

    const res = await httpRequest(`${DSPACE_API}/workflow/workflowitems`, {
        method: 'POST',
        headers: {
            'Authorization': authToken,
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`,
            'Content-Type': 'text/uri-list'
        },
        body: `${DSPACE_API}/submission/workspaceitems/${wsItemId}`
    });

    console.log(`  Workflow result: ${res.statusCode}`);
    return res.statusCode === 201;
}

async function main() {
    console.log('='.repeat(60));
    console.log('KFNL Complete Import to DSpace');
    console.log('Dublin Core Records with Downloaded Files');
    console.log('='.repeat(60));

    // Create directories
    const videosDir = path.join(DOWNLOAD_DIR, 'videos');
    const booksDir = path.join(DOWNLOAD_DIR, 'books');
    if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
    if (!fs.existsSync(booksDir)) fs.mkdirSync(booksDir, { recursive: true });

    // Authenticate
    const loggedIn = await loginToDSpace('ali@ali.com', 'admin');
    if (!loggedIn) {
        console.log('Failed to login');
        return;
    }

    // Get collection
    const collections = await getCollections();
    if (collections.length === 0) {
        console.log('No collections found');
        return;
    }

    const collection = collections[0];
    console.log(`\nUsing collection: ${collection.name} (${collection.uuid})`);

    // Import videos
    console.log('\n' + '='.repeat(60));
    console.log('VIDEOS');
    console.log('='.repeat(60));

    for (const video of VIDEOS) {
        console.log(`\n--- ${video.title} ---`);
        const fileName = path.basename(video.url);
        const localPath = path.join(videosDir, fileName);

        // Download if not exists
        if (!fs.existsSync(localPath)) {
            await downloadFile(video.url, localPath);
        } else {
            const stats = fs.statSync(localPath);
            console.log(`Already downloaded: ${fileName} (${stats.size} bytes)`);
        }

        // Create item with Dublin Core metadata
        const wsItem = await createWorkspaceItem(collection.uuid);
        if (wsItem) {
            await updateItemMetadata(wsItem.id, {
                title: video.title,
                description: video.description,
                publisher: 'مكتبة الملك فهد الوطنية',
                date: '2024',
                language: 'ar',
                type: 'فيديو',
                subject: 'المركز الإعلامي',
                source: video.url,
                rights: '© مكتبة الملك فهد الوطنية'
            });

            // Upload video file
            if (fs.existsSync(localPath)) {
                await uploadBitstream(wsItem.id, localPath, fileName);
            }

            await submitWorkflowItem(wsItem.id);
        }
    }

    // Import books
    console.log('\n' + '='.repeat(60));
    console.log('BOOKS');
    console.log('='.repeat(60));

    for (const book of BOOKS) {
        console.log(`\n--- ${book.title} ---`);
        const fileName = `book_${book.id}.jpg`;
        const localPath = path.join(booksDir, fileName);

        // Download cover
        if (!fs.existsSync(localPath)) {
            await downloadFile(book.imageUrl, localPath);
        } else {
            console.log(`Already downloaded: ${fileName}`);
        }

        // Create item with full Dublin Core
        const wsItem = await createWorkspaceItem(collection.uuid);
        if (wsItem) {
            await updateItemMetadata(wsItem.id, {
                title: book.title,
                author: book.author,
                publisher: book.publisher,
                date: book.date,
                language: book.language,
                subject: book.subject,
                source: book.source,
                type: 'كتاب',
                description: 'كتاب من قسم الكتب المقتناة حديثاً',
                rights: '© مكتبة الملك فهد الوطنية'
            });

            // Upload cover
            if (fs.existsSync(localPath)) {
                await uploadBitstream(wsItem.id, localPath, fileName);
            }

            await submitWorkflowItem(wsItem.id);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(60));
}

main().catch(console.error);
