/**
 * The contents of this file are subject to the license and copyright
 * detailed in the LICENSE and NOTICE files at the root of the source
 * tree and available online at
 *
 * http://www.dspace.org/license/
 */
package org.dspace.app.pdfsplit.service;

import java.io.IOException;
import java.util.List;

import org.dspace.content.Bitstream;
import org.dspace.core.Context;

/**
 * Service interface for PDF splitting operations.
 * Allows extracting specific pages from PDF documents and creating new PDF files.
 *
 * @author DSpace
 */
public interface PdfSplitService {

    /**
     * Extract specified pages from a PDF and return as a new PDF byte array.
     *
     * @param pdfBytes  the source PDF as byte array
     * @param pageRange the page range string (e.g., "1-3", "1,2,5", "1-3,5,7-9")
     * @return byte array containing the extracted pages as a new PDF
     * @throws IOException if PDF processing fails
     */
    byte[] extractPages(byte[] pdfBytes, String pageRange) throws IOException;

    /**
     * Parse a page range string into a list of page numbers.
     * Supports formats like "1-3", "1,2,5", "1-3,5,7-9"
     *
     * @param range    the page range string
     * @param maxPages the maximum number of pages in the document (for validation)
     * @return list of page numbers (1-based)
     */
    List<Integer> parsePageRange(String range, int maxPages);

    /**
     * Check if a bitstream is a PDF file.
     *
     * @param context   the DSpace context
     * @param bitstream the bitstream to check
     * @return true if the bitstream is a PDF, false otherwise
     */
    boolean isPdfBitstream(Context context, Bitstream bitstream);

    /**
     * Get the total number of pages in a PDF.
     *
     * @param pdfBytes the PDF as byte array
     * @return the number of pages
     * @throws IOException if PDF processing fails
     */
    int getPageCount(byte[] pdfBytes) throws IOException;

    /**
     * Get the base name of a file (without extension).
     *
     * @param filename the full filename
     * @return the base name without extension
     */
    String getBaseName(String filename);
}
