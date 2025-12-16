const { Client } = require('pg');

// Map workspace item IDs to metadata
const ITEMS = [
    // Videos
    { wsId: 4577, uuid: '642240e5-d8c2-4269-bc42-26b57a019665', title: 'فيديو مكتبة الملك فهد الوطنية 01', type: 'فيديو', desc: 'فيديو من المركز الإعلامي لمكتبة الملك فهد الوطنية', source: 'https://kfnl.gov.sa/Ar/mediacenter/DocLib1/01.mp4' },
    { wsId: 4578, uuid: '881c76f8-51db-4655-8e79-219f790c1c11', title: 'فيديو مكتبة الملك فهد الوطنية 02', type: 'فيديو', desc: 'فيديو من المركز الإعلامي لمكتبة الملك فهد الوطنية', source: 'https://kfnl.gov.sa/Ar/mediacenter/DocLib1/02.mp4' },
    { wsId: 4579, uuid: 'c1ee4a6f-9591-4d69-ba3e-fd30c0fc076d', title: 'فيديو مكتبة الملك فهد الوطنية 1', type: 'فيديو', desc: 'فيديو من المركز الإعلامي لمكتبة الملك فهد الوطنية', source: 'https://kfnl.gov.sa/Ar/mediacenter/DocLib1/1.mp4' },
    { wsId: 4580, uuid: 'c38ec958-6873-427b-b7f4-ef5a171476ea', title: 'فيديو مكتبة الملك فهد الوطنية 2', type: 'فيديو', desc: 'فيديو من المركز الإعلامي لمكتبة الملك فهد الوطنية', source: 'https://kfnl.gov.sa/Ar/mediacenter/DocLib1/2.mp4' },
    { wsId: 4581, uuid: 'b7daa024-e992-48a7-8a0e-606955b152ff', title: 'فيديو مكتبة الملك فهد الوطنية 3', type: 'فيديو', desc: 'فيديو من المركز الإعلامي لمكتبة الملك فهد الوطنية', source: 'https://kfnl.gov.sa/Ar/mediacenter/DocLib1/3.mp4' },
    // Books
    { wsId: 4582, uuid: 'a0645bf3-1372-4326-b04b-85da38c52f85', title: 'كتاب من مكتبة الملك فهد الوطنية - 142', type: 'كتاب', desc: 'كتاب من قسم الكتب المقتناة حديثاً', author: 'مكتبة الملك فهد الوطنية', source: 'https://kfnl.gov.sa/Ar/RecentlyShelvedBooks/Pages/ViewRecentlyShelvedBooks.aspx?rsbid=142' },
    { wsId: 4583, uuid: '9d9d5d95-21b2-4eac-a006-f8874304f0de', title: 'كتاب من مكتبة الملك فهد الوطنية - 141', type: 'كتاب', desc: 'كتاب من قسم الكتب المقتناة حديثاً', author: 'مكتبة الملك فهد الوطنية', source: 'https://kfnl.gov.sa/Ar/RecentlyShelvedBooks/Pages/ViewRecentlyShelvedBooks.aspx?rsbid=141' },
    { wsId: 4584, uuid: 'd27609c1-5690-475b-9c0a-5876fb67856d', title: 'كتاب من مكتبة الملك فهد الوطنية - 139', type: 'كتاب', desc: 'كتاب من قسم الكتب المقتناة حديثاً', author: 'مكتبة الملك فهد الوطنية', source: 'https://kfnl.gov.sa/Ar/RecentlyShelvedBooks/Pages/ViewRecentlyShelvedBooks.aspx?rsbid=139' }
];

// Standard Dublin Core metadata field IDs in DSpace
const DC_FIELDS = {
    'dc.title': null,           // Will be looked up
    'dc.contributor.author': null,
    'dc.date.issued': null,
    'dc.publisher': null,
    'dc.description': null,
    'dc.subject': null,
    'dc.language.iso': null,
    'dc.type': null,
    'dc.source': null,
    'dc.rights': null
};

async function main() {
    const c = new Client({
        host: 'localhost',
        port: 5432,
        database: 'dspace',
        user: 'dspace',
        password: 'dspace'
    });
    await c.connect();

    // Get metadata field IDs
    const fields = await c.query(`
        SELECT mf.metadata_field_id, ms.short_id || '.' || mf.element || COALESCE('.' || mf.qualifier, '') as field_name
        FROM metadatafieldregistry mf
        JOIN metadataschemaregistry ms ON mf.metadata_schema_id = ms.metadata_schema_id
        WHERE ms.short_id = 'dc'
    `);

    const fieldMap = {};
    fields.rows.forEach(row => {
        fieldMap[row.field_name] = row.metadata_field_id;
    });

    console.log('Dublin Core field IDs:');
    console.log('  dc.title:', fieldMap['dc.title']);
    console.log('  dc.contributor.author:', fieldMap['dc.contributor.author']);
    console.log('  dc.date.issued:', fieldMap['dc.date.issued']);
    console.log('  dc.publisher:', fieldMap['dc.publisher']);
    console.log('  dc.description:', fieldMap['dc.description']);
    console.log('  dc.subject:', fieldMap['dc.subject']);
    console.log('  dc.language.iso:', fieldMap['dc.language.iso']);
    console.log('  dc.type:', fieldMap['dc.type']);
    console.log('  dc.source:', fieldMap['dc.source']);
    console.log('  dc.rights:', fieldMap['dc.rights']);

    // Add metadata to each item
    for (const item of ITEMS) {
        console.log(`\nAdding metadata to item ${item.uuid} (${item.title})...`);

        // Delete existing metadata for this item first
        await c.query('DELETE FROM metadatavalue WHERE dspace_object_id = $1', [item.uuid]);

        // Insert title
        if (fieldMap['dc.title']) {
            await c.query(`
                INSERT INTO metadatavalue (dspace_object_id, metadata_field_id, text_value, place, confidence)
                VALUES ($1, $2, $3, 0, -1)
            `, [item.uuid, fieldMap['dc.title'], item.title]);
            console.log('  + dc.title');
        }

        // Insert author (for books)
        if (item.author && fieldMap['dc.contributor.author']) {
            await c.query(`
                INSERT INTO metadatavalue (dspace_object_id, metadata_field_id, text_value, place, confidence)
                VALUES ($1, $2, $3, 0, -1)
            `, [item.uuid, fieldMap['dc.contributor.author'], item.author]);
            console.log('  + dc.contributor.author');
        }

        // Insert date
        if (fieldMap['dc.date.issued']) {
            await c.query(`
                INSERT INTO metadatavalue (dspace_object_id, metadata_field_id, text_value, place, confidence)
                VALUES ($1, $2, $3, 0, -1)
            `, [item.uuid, fieldMap['dc.date.issued'], '2024']);
            console.log('  + dc.date.issued');
        }

        // Insert publisher
        if (fieldMap['dc.publisher']) {
            await c.query(`
                INSERT INTO metadatavalue (dspace_object_id, metadata_field_id, text_value, place, confidence)
                VALUES ($1, $2, $3, 0, -1)
            `, [item.uuid, fieldMap['dc.publisher'], 'مكتبة الملك فهد الوطنية']);
            console.log('  + dc.publisher');
        }

        // Insert description
        if (item.desc && fieldMap['dc.description']) {
            await c.query(`
                INSERT INTO metadatavalue (dspace_object_id, metadata_field_id, text_value, place, confidence)
                VALUES ($1, $2, $3, 0, -1)
            `, [item.uuid, fieldMap['dc.description'], item.desc]);
            console.log('  + dc.description');
        }

        // Insert subject
        if (fieldMap['dc.subject']) {
            const subject = item.type === 'فيديو' ? 'المركز الإعلامي' : 'الكتب العربية';
            await c.query(`
                INSERT INTO metadatavalue (dspace_object_id, metadata_field_id, text_value, place, confidence)
                VALUES ($1, $2, $3, 0, -1)
            `, [item.uuid, fieldMap['dc.subject'], subject]);
            console.log('  + dc.subject');
        }

        // Insert language
        if (fieldMap['dc.language.iso']) {
            await c.query(`
                INSERT INTO metadatavalue (dspace_object_id, metadata_field_id, text_value, place, confidence)
                VALUES ($1, $2, $3, 0, -1)
            `, [item.uuid, fieldMap['dc.language.iso'], 'ar']);
            console.log('  + dc.language.iso');
        }

        // Insert type
        if (item.type && fieldMap['dc.type']) {
            await c.query(`
                INSERT INTO metadatavalue (dspace_object_id, metadata_field_id, text_value, place, confidence)
                VALUES ($1, $2, $3, 0, -1)
            `, [item.uuid, fieldMap['dc.type'], item.type]);
            console.log('  + dc.type');
        }

        // Insert source
        if (item.source && fieldMap['dc.source']) {
            await c.query(`
                INSERT INTO metadatavalue (dspace_object_id, metadata_field_id, text_value, place, confidence)
                VALUES ($1, $2, $3, 0, -1)
            `, [item.uuid, fieldMap['dc.source'], item.source]);
            console.log('  + dc.source');
        }

        // Insert rights
        if (fieldMap['dc.rights']) {
            await c.query(`
                INSERT INTO metadatavalue (dspace_object_id, metadata_field_id, text_value, place, confidence)
                VALUES ($1, $2, $3, 0, -1)
            `, [item.uuid, fieldMap['dc.rights'], '© مكتبة الملك فهد الوطنية']);
            console.log('  + dc.rights');
        }
    }

    console.log('\n=== Dublin Core metadata added successfully! ===');

    // Verify
    console.log('\nVerifying metadata:');
    for (const item of ITEMS) {
        const mv = await c.query(`
            SELECT ms.short_id || '.' || mf.element || COALESCE('.' || mf.qualifier, '') as field, m.text_value
            FROM metadatavalue m
            JOIN metadatafieldregistry mf ON m.metadata_field_id = mf.metadata_field_id
            JOIN metadataschemaregistry ms ON mf.metadata_schema_id = ms.metadata_schema_id
            WHERE m.dspace_object_id = $1
        `, [item.uuid]);
        console.log(`\nItem ${item.wsId}:`);
        mv.rows.forEach(row => {
            console.log(`  ${row.field}: ${row.text_value.substring(0, 50)}`);
        });
    }

    await c.end();
}

main().catch(console.error);
