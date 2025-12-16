/**
 * The contents of this file are subject to the license and copyright
 * detailed in the LICENSE and NOTICE files at the root of the source
 * tree and available online at
 *
 * http://www.dspace.org/license/
 */
package org.dspace.app.pdfexport.service;

import java.io.IOException;
import java.io.InputStream;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

import org.dspace.app.pdfexport.PdfExportRequest;
import org.dspace.authorize.AuthorizeException;
import org.dspace.content.Bitstream;
import org.dspace.content.Item;
import org.dspace.core.Context;
import org.dspace.eperson.EPerson;

/**
 * Service interface for PDF export operations.
 * Handles partial PDF extraction for admin users.
 *
 * @author DSpace
 */
public interface PdfExportService {

    /**
     * Check if the current user is authorized to perform admin PDF exports.
     * User must be a member of one of the configured admin groups.
     *
     * @param context DSpace context
     * @return true if the user is authorized
     * @throws SQLException if database error occurs
     */
    boolean isAuthorized(Context context) throws SQLException;

    /**
     * Check if a bitstream is a PDF file
     *
     * @param context DSpace context
     * @param bitstream The bitstream to check
     * @return true if the bitstream is a PDF
     * @throws SQLException if database error occurs
     */
    boolean isPdfBitstream(Context context, Bitstream bitstream) throws SQLException;

    /**
     * Get the total number of pages in a PDF bitstream
     *
     * @param context DSpace context
     * @param bitstream The PDF bitstream
     * @return Total number of pages
     * @throws SQLException if database error occurs
     * @throws IOException if I/O error occurs
     * @throws AuthorizeException if authorization fails
     */
    int getPdfPageCount(Context context, Bitstream bitstream) throws SQLException, IOException, AuthorizeException;

    /**
     * Export the first percentage of pages from a PDF bitstream
     *
     * @param context DSpace context
     * @param item The item containing the bitstream
     * @param bitstream The PDF bitstream
     * @param eperson The user requesting the export
     * @param nationalId The national ID of the requester
     * @param ipAddress The IP address of the requester
     * @param percentageToExport Percentage of pages to export (e.g., 0.25 for 25%)
     * @return InputStream containing the extracted PDF
     * @throws SQLException if database error occurs
     * @throws IOException if I/O error occurs
     * @throws AuthorizeException if authorization fails
     */
    InputStream exportFirstPercentage(Context context, Item item, Bitstream bitstream,
                                      EPerson eperson, String nationalId, String ipAddress,
                                      double percentageToExport)
        throws SQLException, IOException, AuthorizeException;

    /**
     * Export specific pages from a PDF bitstream
     *
     * @param context DSpace context
     * @param item The item containing the bitstream
     * @param bitstream The PDF bitstream
     * @param eperson The user requesting the export
     * @param nationalId The national ID of the requester
     * @param ipAddress The IP address of the requester
     * @param pageRange Page range string (e.g., "1-5,10,15-20")
     * @param maxPercentage Maximum percentage of total pages allowed
     * @return InputStream containing the extracted PDF
     * @throws SQLException if database error occurs
     * @throws IOException if I/O error occurs
     * @throws AuthorizeException if authorization fails
     * @throws IllegalArgumentException if page range exceeds maximum allowed
     */
    InputStream exportCustomPages(Context context, Item item, Bitstream bitstream,
                                  EPerson eperson, String nationalId, String ipAddress,
                                  String pageRange, double maxPercentage)
        throws SQLException, IOException, AuthorizeException;

    /**
     * Parse a page range string into a list of page numbers
     *
     * @param pageRange Page range string (e.g., "1-5,10,15-20")
     * @param totalPages Total pages in the document
     * @return List of page numbers (1-based)
     * @throws IllegalArgumentException if the range is invalid
     */
    List<Integer> parsePageRange(String pageRange, int totalPages);

    /**
     * Check if a duplicate request exists within the configured time window
     *
     * @param context DSpace context
     * @param epersonUuid The UUID of the eperson
     * @param bitstreamUuid The UUID of the bitstream
     * @return true if a duplicate exists
     * @throws SQLException if database error occurs
     */
    boolean isDuplicateRequest(Context context, UUID epersonUuid, UUID bitstreamUuid)
        throws SQLException;

    /**
     * Get all PDF export requests by a user
     *
     * @param context DSpace context
     * @param epersonUuid The UUID of the eperson
     * @return List of PdfExportRequest objects
     * @throws SQLException if database error occurs
     */
    List<PdfExportRequest> getRequestsByUser(Context context, UUID epersonUuid)
        throws SQLException;

    /**
     * Get a PDF export request by its unique request ID
     *
     * @param context DSpace context
     * @param requestId The unique request ID
     * @return The PdfExportRequest or null
     * @throws SQLException if database error occurs
     */
    PdfExportRequest getRequestByRequestId(Context context, String requestId)
        throws SQLException;

    /**
     * Get all PDF export requests with pagination
     *
     * @param context DSpace context
     * @param limit Maximum number of results
     * @param offset Offset for pagination
     * @return List of PdfExportRequest objects
     * @throws SQLException if database error occurs
     */
    List<PdfExportRequest> getAllRequests(Context context, int limit, int offset)
        throws SQLException;

    /**
     * Get the configured percentage to export for first 25% option
     *
     * @return The percentage (e.g., 0.25 for 25%)
     */
    double getPercentageToExport();

    /**
     * Get the configured maximum percentage for custom pages
     *
     * @return The maximum percentage (e.g., 0.25 for 25%)
     */
    double getMaxCustomPagesPercentage();

    /**
     * Get the list of allowed group names for admin PDF export
     *
     * @return List of group names
     */
    List<String> getAllowedGroups();
}
