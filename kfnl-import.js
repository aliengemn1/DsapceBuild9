const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Disable SSL verification for KFNL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DSPACE_API = 'http://localhost:8080/server/api';
let authToken = null;

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

// Download file from URL
async function downloadFile(url, destPath) {
    console.log(`  Downloading: ${url}`);
    try {
        const response = await httpRequest(url);
        if (response.statusCode === 200) {
            fs.writeFileSync(destPath, response.body);
            console.log(`  Saved to: ${destPath}`);
            return true;
        } else {
            console.log(`  Failed with status: ${response.statusCode}`);
            return false;
        }
    } catch (err) {
        console.log(`  Download error: ${err.message}`);
        return false;
    }
}

// Parse books from HTML
function parseBooks(html) {
    const books = [];

    // Find all book entries - looking for ViewRecentlyShelvedBooks links
    const bookPattern = /href=['"]([^'"]*ViewRecentlyShelvedBooks\.aspx\?rsbid=(\d+))['"]/g;
    const titlePattern = /<Title>([^<]+)<\/Title>/g;
    const imagePattern = /src=['"]([^'"]*\/Attachments\/\d+\/[^'"]+\.(jpg|jpeg|png|gif))['"]/gi;

    // Extract from base64 encoded data in __VIEWSTATE or directly
    let match;
    const seenIds = new Set();

    // Try to find book data in the HTML
    // Look for patterns like: kfnl.gov.sa/Ar/RecentlyShelvedBooks/Lists/RecentlyShelvedBooks/Attachments/
    const attachmentPattern = /https?:\/\/kfnl\.gov\.sa\/Ar\/RecentlyShelvedBooks\/Lists\/RecentlyShelvedBooks\/Attachments\/(\d+)\/([^'">\s]+\.(jpg|jpeg|png))/gi;

    while ((match = attachmentPattern.exec(html)) !== null) {
        const id = match[1];
        if (!seenIds.has(id)) {
            seenIds.add(id);
            books.push({
                id: id,
                imageUrl: match[0],
                detailUrl: `https://kfnl.gov.sa/Ar/RecentlyShelvedBooks/Pages/ViewRecentlyShelvedBooks.aspx?rsbid=${id}`
            });
        }
    }

    console.log(`Found ${books.length} books with images`);
    return books;
}

// Parse photos from HTML
function parsePhotos(html) {
    const photos = [];

    // Look for photo gallery links
    const galleryPattern = /href=['"]([^'"]*PhotosLibrary[^'"]*\.aspx[^'"]*)['"]/gi;
    const imagePattern = /src=['"]([^'"]*\.(jpg|jpeg|png|gif))['"]/gi;

    let match;
    const seenUrls = new Set();

    // Find all image URLs in media center
    const mediaImagePattern = /https?:\/\/kfnl\.gov\.sa[^'">\s]*mediacenter[^'">\s]*\.(jpg|jpeg|png|gif)/gi;

    while ((match = mediaImagePattern.exec(html)) !== null) {
        const url = match[0];
        if (!seenUrls.has(url)) {
            seenUrls.add(url);
            photos.push({
                imageUrl: url,
                title: path.basename(url, path.extname(url))
            });
        }
    }

    // Also look for any images in /PublishingImages/
    const publishingImagePattern = /https?:\/\/kfnl\.gov\.sa[^'">\s]*PublishingImages[^'">\s]*\.(jpg|jpeg|png|gif)/gi;
    while ((match = publishingImagePattern.exec(html)) !== null) {
        const url = match[0];
        if (!seenUrls.has(url)) {
            seenUrls.add(url);
            photos.push({
                imageUrl: url,
                title: path.basename(url, path.extname(url))
            });
        }
    }

    console.log(`Found ${photos.length} photos`);
    return photos;
}

// Parse videos from HTML
function parseVideos(html) {
    const videos = [];

    // Look for YouTube embeds
    const youtubePattern = /(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/gi;

    // Look for MP4 video files
    const mp4Pattern = /https?:\/\/[^'">\s]+\.(mp4|webm|mov)/gi;

    let match;
    const seenIds = new Set();

    while ((match = youtubePattern.exec(html)) !== null) {
        const videoId = match[1];
        if (!seenIds.has(videoId)) {
            seenIds.add(videoId);
            videos.push({
                type: 'youtube',
                videoId: videoId,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                embedUrl: `https://www.youtube.com/embed/${videoId}`
            });
        }
    }

    while ((match = mp4Pattern.exec(html)) !== null) {
        const url = match[0];
        if (!seenIds.has(url)) {
            seenIds.add(url);
            videos.push({
                type: 'file',
                url: url,
                title: path.basename(url, path.extname(url))
            });
        }
    }

    console.log(`Found ${videos.length} videos`);
    return videos;
}

// Login to DSpace and get auth token
async function loginToDSpace() {
    console.log('\nLogging into DSpace...');

    // First, get CSRF token
    const statusRes = await httpRequest(`${DSPACE_API}/authn/status`, {
        headers: {
            'Accept': 'application/json'
        }
    });

    const csrfToken = statusRes.headers['dspace-xsrf-token'];
    console.log('Got CSRF token');

    // Login
    const loginRes = await httpRequest(`${DSPACE_API}/authn/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
        },
        body: 'user=admin@example.com&password=admin'
    });

    if (loginRes.statusCode === 200) {
        authToken = loginRes.headers['authorization'];
        console.log('Login successful!');
        return true;
    } else {
        console.log(`Login failed with status ${loginRes.statusCode}`);
        console.log(loginRes.body.toString());
        return false;
    }
}

// Get or create collection
async function getOrCreateCollection(communityId, name) {
    console.log(`\nLooking for collection: ${name}`);

    // Search for existing collection
    const searchRes = await httpRequest(`${DSPACE_API}/discover/search/objects?query=${encodeURIComponent(name)}&dsoType=collection`, {
        headers: {
            'Accept': 'application/json',
            'Authorization': authToken
        }
    });

    const searchData = JSON.parse(searchRes.body.toString());
    if (searchData._embedded?.searchResult?._embedded?.objects?.length > 0) {
        const collection = searchData._embedded.searchResult._embedded.objects[0]._embedded.indexableObject;
        console.log(`Found existing collection: ${collection.uuid}`);
        return collection.uuid;
    }

    console.log('Collection not found, will need to create it');
    return null;
}

// Create a new item in DSpace
async function createDSpaceItem(collectionId, metadata, bitstreamPath = null, thumbnailPath = null) {
    console.log(`\nCreating item: ${metadata.title}`);

    // Get CSRF token
    const statusRes = await httpRequest(`${DSPACE_API}/authn/status`, {
        headers: {
            'Accept': 'application/json',
            'Authorization': authToken
        }
    });
    const csrfToken = statusRes.headers['dspace-xsrf-token'];

    // Create workspace item
    const createRes = await httpRequest(`${DSPACE_API}/submission/workspaceitems?owningCollection=${collectionId}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authToken,
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
        },
        body: JSON.stringify({})
    });

    if (createRes.statusCode !== 201) {
        console.log(`Failed to create workspace item: ${createRes.statusCode}`);
        console.log(createRes.body.toString());
        return null;
    }

    const workspaceItem = JSON.parse(createRes.body.toString());
    const itemId = workspaceItem._embedded.item.uuid;
    console.log(`Created workspace item: ${workspaceItem.id}, item: ${itemId}`);

    // Update metadata
    const metadataOps = [];
    if (metadata.title) {
        metadataOps.push({
            op: 'add',
            path: '/metadata/dc.title',
            value: [{ value: metadata.title, language: 'ar' }]
        });
    }
    if (metadata.description) {
        metadataOps.push({
            op: 'add',
            path: '/metadata/dc.description',
            value: [{ value: metadata.description, language: 'ar' }]
        });
    }
    if (metadata.type) {
        metadataOps.push({
            op: 'add',
            path: '/metadata/dc.type',
            value: [{ value: metadata.type }]
        });
    }
    if (metadata.source) {
        metadataOps.push({
            op: 'add',
            path: '/metadata/dc.source',
            value: [{ value: metadata.source }]
        });
    }

    if (metadataOps.length > 0) {
        const patchRes = await httpRequest(`${DSPACE_API}/core/items/${itemId}`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': authToken,
                'X-XSRF-TOKEN': csrfToken,
                'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
            },
            body: JSON.stringify(metadataOps)
        });

        if (patchRes.statusCode !== 200) {
            console.log(`Warning: Failed to update metadata: ${patchRes.statusCode}`);
        }
    }

    // Submit the workspace item to make it a real item
    const submitRes = await httpRequest(`${DSPACE_API}/workflow/workflowitems`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'text/uri-list',
            'Authorization': authToken,
            'X-XSRF-TOKEN': csrfToken,
            'Cookie': `DSPACE-XSRF-COOKIE=${csrfToken}`
        },
        body: `${DSPACE_API}/submission/workspaceitems/${workspaceItem.id}`
    });

    console.log(`Item submission status: ${submitRes.statusCode}`);
    return itemId;
}

// Main function
async function main() {
    console.log('===========================================');
    console.log('  KFNL Content Import to DSpace');
    console.log('===========================================\n');

    // Create downloads directory
    const downloadDir = 'C:\\DsapceBuild9\\kfnl_downloads';
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Read downloaded HTML files
    console.log('Reading KFNL HTML files...\n');

    const booksHtml = fs.readFileSync('C:\\DsapceBuild9\\kfnl_books.html', 'utf-8');
    const photosHtml = fs.readFileSync('C:\\DsapceBuild9\\kfnl_photos.html', 'utf-8');
    const videosHtml = fs.readFileSync('C:\\DsapceBuild9\\kfnl_videos.html', 'utf-8');

    // Parse content
    console.log('--- Parsing Books ---');
    const books = parseBooks(booksHtml);

    console.log('\n--- Parsing Photos ---');
    const photos = parsePhotos(photosHtml);

    console.log('\n--- Parsing Videos ---');
    const videos = parseVideos(videosHtml);

    // Output summary
    console.log('\n===========================================');
    console.log('  Content Summary');
    console.log('===========================================');
    console.log(`Books found: ${books.length}`);
    console.log(`Photos found: ${photos.length}`);
    console.log(`Videos found: ${videos.length}`);

    // Save parsed data
    fs.writeFileSync(path.join(downloadDir, 'books.json'), JSON.stringify(books, null, 2));
    fs.writeFileSync(path.join(downloadDir, 'photos.json'), JSON.stringify(photos, null, 2));
    fs.writeFileSync(path.join(downloadDir, 'videos.json'), JSON.stringify(videos, null, 2));

    console.log('\nParsed data saved to:');
    console.log(`  - ${path.join(downloadDir, 'books.json')}`);
    console.log(`  - ${path.join(downloadDir, 'photos.json')}`);
    console.log(`  - ${path.join(downloadDir, 'videos.json')}`);

    // Download book covers
    console.log('\n--- Downloading Book Covers ---');
    const booksDir = path.join(downloadDir, 'books');
    if (!fs.existsSync(booksDir)) {
        fs.mkdirSync(booksDir, { recursive: true });
    }

    for (const book of books.slice(0, 10)) { // Limit to first 10 for testing
        const ext = path.extname(book.imageUrl) || '.jpg';
        const filename = `book_${book.id}${ext}`;
        const destPath = path.join(booksDir, filename);
        await downloadFile(book.imageUrl, destPath);
        book.localPath = destPath;
    }

    // Update books.json with local paths
    fs.writeFileSync(path.join(downloadDir, 'books.json'), JSON.stringify(books, null, 2));

    console.log('\n===========================================');
    console.log('  Download Complete!');
    console.log('===========================================');
    console.log('\nNext steps:');
    console.log('1. Review the downloaded content');
    console.log('2. Run the DSpace import process');
}

// Run the main function
main().catch(console.error);
