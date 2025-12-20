/**
 * The contents of this file are subject to the license and copyright
 * detailed in the LICENSE and NOTICE files at the root of the source
 * tree and available online at
 *
 * http://www.dspace.org/license/
 */
package org.dspace.app.rest.submit.step;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.sql.SQLException;
import java.util.List;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.dspace.app.pdfsplit.service.PdfSplitService;
import org.dspace.app.rest.submit.ListenerProcessingStep;
import org.dspace.authorize.AuthorizeException;
import org.dspace.content.Bitstream;
import org.dspace.content.BitstreamFormat;
import org.dspace.content.Bundle;
import org.dspace.content.InProgressSubmission;
import org.dspace.content.Item;
import org.dspace.content.MetadataValue;
import org.dspace.content.factory.ContentServiceFactory;
import org.dspace.content.service.BitstreamFormatService;
import org.dspace.content.service.BitstreamService;
import org.dspace.content.service.BundleService;
import org.dspace.content.service.ItemService;
import org.dspace.core.Context;
import org.dspace.utils.DSpace;

/**
 * Submission step that processes uploaded PDF files and splits them based on
 * user-specified page ranges for abstract and table of contents.
 *
 * This step looks for bitstream metadata fields:
 * - local.pdf.abstract-pages: Page range for abstract extraction (e.g., "1-2")
 * - local.pdf.toc-pages: Page range for table of contents extraction (e.g., "3-5")
 *
 * Extracted pages are stored in separate bundles:
 * - ABSTRACT bundle for abstract pages
 * - TOC bundle for table of contents pages
 *
 * @author DSpace
 */
public class PdfSplitStep implements ListenerProcessingStep {

    private static final Logger log = LogManager.getLogger(PdfSplitStep.class);

    // Metadata field names for page ranges
    private static final String METADATA_ABSTRACT_PAGES = "local.pdf.abstract-pages";
    private static final String METADATA_TOC_PAGES = "local.pdf.toc-pages";

    // Bundle names for extracted files
    private static final String BUNDLE_ABSTRACT = "ABSTRACT";
    private static final String BUNDLE_TOC = "TOC";
    private static final String BUNDLE_ORIGINAL = "ORIGINAL";

    private ItemService itemService = ContentServiceFactory.getInstance().getItemService();
    private BundleService bundleService = ContentServiceFactory.getInstance().getBundleService();
    private BitstreamService bitstreamService = ContentServiceFactory.getInstance().getBitstreamService();
    private BitstreamFormatService bitstreamFormatService = ContentServiceFactory.getInstance()
            .getBitstreamFormatService();
    private PdfSplitService pdfSplitService = new DSpace().getSingletonService(PdfSplitService.class);

    @Override
    public void doPreProcessing(Context context, InProgressSubmission wsi) {
        // No pre-processing needed
    }

    @Override
    public void doPostProcessing(Context context, InProgressSubmission wsi) {
        try {
            Item item = wsi.getItem();
            List<Bundle> originalBundles = itemService.getBundles(item, BUNDLE_ORIGINAL);

            for (Bundle bundle : originalBundles) {
                // Create a copy of bitstreams list to avoid concurrent modification
                List<Bitstream> bitstreams = bundle.getBitstreams();
                for (int i = 0; i < bitstreams.size(); i++) {
                    Bitstream bitstream = bitstreams.get(i);
                    processBitstream(context, item, bitstream);
                }
            }
        } catch (Exception e) {
            log.error("Error in PDF split post-processing", e);
            throw new RuntimeException("Failed to process PDF split: " + e.getMessage(), e);
        }
    }

    /**
     * Process a single bitstream for PDF splitting.
     */
    private void processBitstream(Context context, Item item, Bitstream bitstream)
            throws SQLException, AuthorizeException, IOException {

        // Check if this is a PDF
        if (!pdfSplitService.isPdfBitstream(context, bitstream)) {
            log.debug("Skipping non-PDF bitstream: {}", bitstream.getName());
            return;
        }

        // Get page range metadata from bitstream
        String abstractPages = getBitstreamMetadata(bitstream, METADATA_ABSTRACT_PAGES);
        String tocPages = getBitstreamMetadata(bitstream, METADATA_TOC_PAGES);

        // If no page ranges specified, nothing to do
        if (StringUtils.isBlank(abstractPages) && StringUtils.isBlank(tocPages)) {
            log.debug("No page ranges specified for bitstream: {}", bitstream.getName());
            return;
        }

        // Retrieve PDF content
        byte[] pdfBytes;
        try (InputStream is = bitstreamService.retrieve(context, bitstream)) {
            pdfBytes = IOUtils.toByteArray(is);
        }

        String baseName = pdfSplitService.getBaseName(bitstream.getName());
        log.info("Processing PDF '{}' for splitting", bitstream.getName());

        // Extract abstract pages if specified
        if (StringUtils.isNotBlank(abstractPages)) {
            try {
                byte[] abstractPdf = pdfSplitService.extractPages(pdfBytes, abstractPages);
                Bundle abstractBundle = getOrCreateBundle(context, item, BUNDLE_ABSTRACT);
                String abstractFileName = baseName + "_abstract.pdf";
                createBitstream(context, abstractBundle, abstractPdf, abstractFileName);
                log.info("Created abstract PDF '{}' with pages: {}", abstractFileName, abstractPages);
            } catch (IOException e) {
                log.error("Failed to extract abstract pages '{}' from PDF: {}", abstractPages, e.getMessage());
            }
        }

        // Extract table of contents pages if specified
        if (StringUtils.isNotBlank(tocPages)) {
            try {
                byte[] tocPdf = pdfSplitService.extractPages(pdfBytes, tocPages);
                Bundle tocBundle = getOrCreateBundle(context, item, BUNDLE_TOC);
                String tocFileName = baseName + "_toc.pdf";
                createBitstream(context, tocBundle, tocPdf, tocFileName);
                log.info("Created TOC PDF '{}' with pages: {}", tocFileName, tocPages);
            } catch (IOException e) {
                log.error("Failed to extract TOC pages '{}' from PDF: {}", tocPages, e.getMessage());
            }
        }
    }

    /**
     * Get metadata value from a bitstream.
     */
    private String getBitstreamMetadata(Bitstream bitstream, String metadataField) {
        String[] tokens = metadataField.split("\\.");
        String schema = tokens[0];
        String element = tokens.length > 1 ? tokens[1] : null;
        String qualifier = tokens.length > 2 ? tokens[2] : null;

        List<MetadataValue> metadata = bitstreamService.getMetadata(bitstream, schema, element, qualifier, null);
        if (metadata != null && !metadata.isEmpty()) {
            return metadata.get(0).getValue();
        }
        return null;
    }

    /**
     * Get an existing bundle or create a new one if it doesn't exist.
     */
    private Bundle getOrCreateBundle(Context context, Item item, String bundleName)
            throws SQLException, AuthorizeException {
        List<Bundle> bundles = itemService.getBundles(item, bundleName);
        if (!bundles.isEmpty()) {
            return bundles.get(0);
        }
        return bundleService.create(context, item, bundleName);
    }

    /**
     * Create a new bitstream in the specified bundle.
     */
    private Bitstream createBitstream(Context context, Bundle bundle, byte[] content, String filename)
            throws SQLException, AuthorizeException, IOException {

        try (InputStream is = new ByteArrayInputStream(content)) {
            Bitstream bitstream = bitstreamService.create(context, bundle, is);
            bitstream.setName(context, filename);

            // Set format to PDF
            BitstreamFormat pdfFormat = bitstreamFormatService.findByMIMEType(context, "application/pdf");
            if (pdfFormat != null) {
                bitstream.setFormat(context, pdfFormat);
            } else {
                // Fallback to guessing format
                BitstreamFormat guessedFormat = bitstreamFormatService.guessFormat(context, bitstream);
                bitstream.setFormat(context, guessedFormat);
            }

            bitstreamService.update(context, bitstream);
            return bitstream;
        }
    }
}
