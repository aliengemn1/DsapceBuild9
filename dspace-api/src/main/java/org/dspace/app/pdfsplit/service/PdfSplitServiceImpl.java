/**
 * The contents of this file are subject to the license and copyright
 * detailed in the LICENSE and NOTICE files at the root of the source
 * tree and available online at
 *
 * http://www.dspace.org/license/
 */
package org.dspace.app.pdfsplit.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import org.apache.commons.lang3.StringUtils;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.dspace.content.Bitstream;
import org.dspace.content.BitstreamFormat;
import org.dspace.core.Context;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Implementation of PdfSplitService for extracting pages from PDF documents.
 * Uses Apache PDFBox library for PDF manipulation.
 *
 * @author DSpace
 */
@Service
public class PdfSplitServiceImpl implements PdfSplitService {

    private static final Logger log = LoggerFactory.getLogger(PdfSplitServiceImpl.class);

    private static final String PDF_MIME_TYPE = "application/pdf";
    private static final String PDF_EXTENSION = ".pdf";

    @Override
    public byte[] extractPages(byte[] pdfBytes, String pageRange) throws IOException {
        if (pdfBytes == null || pdfBytes.length == 0) {
            throw new IOException("PDF bytes cannot be null or empty");
        }

        if (StringUtils.isBlank(pageRange)) {
            throw new IOException("Page range cannot be blank");
        }

        try (PDDocument sourceDocument = PDDocument.load(pdfBytes);
             PDDocument targetDocument = new PDDocument()) {

            int totalPages = sourceDocument.getNumberOfPages();
            List<Integer> pageNumbers = parsePageRange(pageRange, totalPages);

            if (pageNumbers.isEmpty()) {
                throw new IOException("No valid pages found in range: " + pageRange);
            }

            log.info("Extracting {} pages from PDF with {} total pages", pageNumbers.size(), totalPages);

            for (int pageNum : pageNumbers) {
                int pageIndex = pageNum - 1; // Convert to 0-based index
                if (pageIndex >= 0 && pageIndex < totalPages) {
                    PDPage page = sourceDocument.getPage(pageIndex);
                    targetDocument.importPage(page);
                } else {
                    log.warn("Skipping invalid page number: {} (total pages: {})", pageNum, totalPages);
                }
            }

            if (targetDocument.getNumberOfPages() == 0) {
                throw new IOException("No pages were extracted from the PDF");
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            targetDocument.save(baos);
            return baos.toByteArray();
        }
    }

    @Override
    public List<Integer> parsePageRange(String range, int maxPages) {
        List<Integer> pages = new ArrayList<>();

        if (StringUtils.isBlank(range)) {
            return pages;
        }

        // Remove whitespace and split by comma
        String[] parts = range.replaceAll("\\s+", "").split(",");

        for (String part : parts) {
            try {
                if (part.contains("-")) {
                    // Handle range like "1-5"
                    String[] rangeParts = part.split("-");
                    if (rangeParts.length == 2) {
                        int start = Integer.parseInt(rangeParts[0]);
                        int end = Integer.parseInt(rangeParts[1]);

                        // Validate range
                        start = Math.max(1, start);
                        end = Math.min(maxPages, end);

                        for (int i = start; i <= end; i++) {
                            if (!pages.contains(i)) {
                                pages.add(i);
                            }
                        }
                    }
                } else {
                    // Handle single page number
                    int pageNum = Integer.parseInt(part);
                    if (pageNum >= 1 && pageNum <= maxPages && !pages.contains(pageNum)) {
                        pages.add(pageNum);
                    }
                }
            } catch (NumberFormatException e) {
                log.warn("Invalid page number format in range '{}': {}", range, part);
            }
        }

        // Sort pages in ascending order
        pages.sort(Integer::compareTo);

        return pages;
    }

    @Override
    public boolean isPdfBitstream(Context context, Bitstream bitstream) {
        if (bitstream == null) {
            return false;
        }

        // Check by filename extension
        String name = bitstream.getName();
        if (name != null && name.toLowerCase().endsWith(PDF_EXTENSION)) {
            return true;
        }

        // Check by MIME type
        try {
            BitstreamFormat format = bitstream.getFormat(context);
            if (format != null && PDF_MIME_TYPE.equals(format.getMIMEType())) {
                return true;
            }
        } catch (SQLException e) {
            log.error("Error checking bitstream format", e);
        }

        return false;
    }

    @Override
    public int getPageCount(byte[] pdfBytes) throws IOException {
        if (pdfBytes == null || pdfBytes.length == 0) {
            return 0;
        }

        try (PDDocument document = PDDocument.load(pdfBytes)) {
            return document.getNumberOfPages();
        }
    }

    @Override
    public String getBaseName(String filename) {
        if (StringUtils.isBlank(filename)) {
            return "document";
        }

        // Remove extension
        int lastDot = filename.lastIndexOf('.');
        if (lastDot > 0) {
            return filename.substring(0, lastDot);
        }

        return filename;
    }
}
