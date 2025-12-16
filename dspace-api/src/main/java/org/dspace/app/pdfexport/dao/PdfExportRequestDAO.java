/**
 * The contents of this file are subject to the license and copyright
 * detailed in the LICENSE and NOTICE files at the root of the source
 * tree and available online at
 *
 * http://www.dspace.org/license/
 */
package org.dspace.app.pdfexport.dao;

import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

import org.dspace.app.pdfexport.PdfExportRequest;
import org.dspace.core.Context;
import org.dspace.core.GenericDAO;

/**
 * Database Access Object interface for PdfExportRequest entity.
 * This interface is responsible for all database operations related to PDF export requests.
 *
 * @author DSpace
 */
public interface PdfExportRequestDAO extends GenericDAO<PdfExportRequest> {

    /**
     * Find a PDF export request by its unique request ID
     *
     * @param context DSpace context
     * @param requestId The unique request ID
     * @return The PdfExportRequest or null if not found
     * @throws SQLException if database error occurs
     */
    PdfExportRequest findByRequestId(Context context, String requestId) throws SQLException;

    /**
     * Find all PDF export requests by a specific user
     *
     * @param context DSpace context
     * @param epersonUuid The UUID of the eperson
     * @return List of PdfExportRequest objects
     * @throws SQLException if database error occurs
     */
    List<PdfExportRequest> findByEperson(Context context, UUID epersonUuid) throws SQLException;

    /**
     * Find all PDF export requests for a specific item
     *
     * @param context DSpace context
     * @param itemUuid The UUID of the item
     * @return List of PdfExportRequest objects
     * @throws SQLException if database error occurs
     */
    List<PdfExportRequest> findByItem(Context context, UUID itemUuid) throws SQLException;

    /**
     * Find all PDF export requests for a specific bitstream
     *
     * @param context DSpace context
     * @param bitstreamUuid The UUID of the bitstream
     * @return List of PdfExportRequest objects
     * @throws SQLException if database error occurs
     */
    List<PdfExportRequest> findByBitstream(Context context, UUID bitstreamUuid) throws SQLException;

    /**
     * Check if a duplicate request exists for the same user, item and bitstream
     * within a specified time window (for preventing abuse)
     *
     * @param context DSpace context
     * @param epersonUuid The UUID of the eperson
     * @param bitstreamUuid The UUID of the bitstream
     * @param minutesWindow Time window in minutes to check for duplicates
     * @return true if a duplicate exists within the time window
     * @throws SQLException if database error occurs
     */
    boolean existsDuplicateRequest(Context context, UUID epersonUuid, UUID bitstreamUuid,
                                   int minutesWindow) throws SQLException;

    /**
     * Get all PDF export requests with pagination
     *
     * @param context DSpace context
     * @param limit Maximum number of results
     * @param offset Offset for pagination
     * @return List of PdfExportRequest objects
     * @throws SQLException if database error occurs
     */
    List<PdfExportRequest> findAll(Context context, int limit, int offset) throws SQLException;

    /**
     * Count total number of PDF export requests
     *
     * @param context DSpace context
     * @return Total count of requests
     * @throws SQLException if database error occurs
     */
    int countAll(Context context) throws SQLException;
}
