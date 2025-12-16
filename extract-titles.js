const fs = require('fs');
const path = require('path');

const downloadDir = 'C:\\DsapceBuild9\\kfnl_downloads';
const books = JSON.parse(fs.readFileSync(path.join(downloadDir, 'books.json'), 'utf-8'));

// Extract titles from book detail pages
for (const book of books) {
    const htmlFile = path.join(downloadDir, `book_${book.id}.html`);
    if (fs.existsSync(htmlFile)) {
        const html = fs.readFileSync(htmlFile, 'utf-8');

        // Extract title from <title> tag
        const titleMatch = html.match(/<title>\s*([^<]+?)\s*<\/title>/i);
        if (titleMatch) {
            book.title = titleMatch[1].trim();
        }

        // Also try to extract from page content
        // Look for Arabic book title pattern in the content
        const contentMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (contentMatch && !book.title) {
            book.title = contentMatch[1].trim();
        }
    }

    console.log(`Book ${book.id}: ${book.title || 'No title found'}`);
}

// Save updated books
fs.writeFileSync(path.join(downloadDir, 'books.json'), JSON.stringify(books, null, 2));
console.log('\nUpdated books.json with titles');
