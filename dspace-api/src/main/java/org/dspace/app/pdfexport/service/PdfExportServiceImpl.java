/**
 * The contents of this file are subject to the license and copyright
 * detailed in the LICENSE and NOTICE files at the root of the source
 * tree and available online at
 *
 * http://www.dspace.org/license/
 */
package org.dspace.app.pdfexport.service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.dspace.app.pdfexport.PdfExportRequest;
import org.dspace.app.pdfexport.dao.PdfExportRequestDAO;
import org.dspace.authorize.AuthorizeException;
import org.dspace.content.Bitstream;
import org.dspace.content.BitstreamFormat;
import org.dspace.content.Item;
import org.dspace.content.service.BitstreamService;
import org.dspace.content.service.ItemService;
import org.dspace.core.Context;
import org.dspace.eperson.EPerson;
import org.dspace.eperson.Group;
import org.dspace.eperson.service.GroupService;
import org.dspace.services.ConfigurationService;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Implementation of the PdfExportService interface.
 * Handles partial PDF extraction for admin users using PDFBox.
 *
 * @author DSpace
 */
public class PdfExportServiceImpl implements PdfExportService {

    private static final Logger log = LogManager.getLogger(PdfExportServiceImpl.class);

    // Configuration property keys
    private static final String CONFIG_ENABLED = "admin.pdf.export.enabled";
    private static final String CONFIG_ALLOWED_GROUPS = "admin.pdf.export.allowed.groups";
    private static final String CONFIG_PERCENTAGE = "admin.pdf.export.percentage";
    private static final String CONFIG_MAX_CUSTOM_PERCENTAGE = "admin.pdf.export.max.custom.percentage";
    private static final String CONFIG_DUPLICATE_WINDOW = "admin.pdf.export.duplicate.window.minutes";

    @Autowired
    private PdfExportRequestDAO pdfExportRequestDAO;

    @Autowired
    private BitstreamService bitstreamService;

    @Autowired
    private ItemService itemService;

    @Autowired
    private GroupService groupService;

    @Autowired
    private ConfigurationService configurationService;

    @Override
    public boolean isAuthorized(Context context) throws SQLException {
        // Check if feature is enabled
        if (!configurationService.getBooleanProperty(CONFIG_ENABLED, false)) {
            return false;
        }

        EPerson currentUser = context.getCurrentUser();
        if (currentUser == null) {
            return false;
        }

        // Get allowed groups from configuration
        List<String> allowedGroups = getAllowedGroups();
        if (allowedGroups.isEmpty()) {
            return false;
        }

        // Check if user is in any of the allowed groups
        for (String groupName : allowedGroups) {
            Group group = groupService.findByName(context, groupName);
            if (group != null && groupService.isMember(context, currentUser, group)) {
                return true;
            }
        }

        return false;
    }

    @Override
    public boolean isPdfBitstream(Context context, Bitstream bitstream) throws SQLException {
        if (bitstream == null) {
            return false;
        }

        // Check by MIME type
        BitstreamFormat format = bitstream.getFormat(context);
        if (format != null) {
            String mimeType = format.getMIMEType();
            if ("application/pdf".equals(mimeType)) {
                return true;
            }
        }

        // Check by filename extension
        String name = bitstream.getName();
        if (name != null && name.toLowerCase().endsWith(".pdf")) {
            return true;
        }

        return false;
    }

    @Override
    public int getPdfPageCount(Context context, Bitstream bitstream)
            throws SQLException, IOException, AuthorizeException {
        try (InputStream is = bitstreamService.retrieve(context, bitstream)) {
            byte[] pdfBytes = IOUtils.toByteArray(is);
            try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdfBytes))) {
                return document.getNumberOfPages();
            }
        }
    }

    @Override
    public InputStream exportFirstPercentage(Context context, Item item, Bitstream bitstream,
                                             EPerson eperson, String nationalId, String ipAddress,
                                             double percentageToExport)
        throws SQLException, IOException, AuthorizeException {

        // Verify authorization
        if (!isAuthorized(context)) {
            throw new AuthorizeException("User is not authorized for admin PDF export");
        }

        // Check for duplicate request
        if (isDuplicateRequest(context, eperson.getID(), bitstream.getID())) {
            throw new IllegalStateException("A duplicate export request was recently submitted");
        }

        // Get the PDF content
        int totalPages;
        byte[] pdfBytes;
        try (InputStream is = bitstreamService.retrieve(context, bitstream)) {
            pdfBytes = IOUtils.toByteArray(is);
            try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdfBytes))) {
                totalPages = document.getNumberOfPages();
            }
        }

        // Calculate pages to export
        int pagesToExport = Math.max(1, (int) Math.ceil(totalPages * percentageToExport));

        // Create list of page numbers (1 to pagesToExport)
        List<Integer> pageNumbers = new ArrayList<>();
        for (int i = 1; i <= pagesToExport; i++) {
            pageNumbers.add(i);
        }

        // Extract pages
        byte[] extractedPdf = extractPages(pdfBytes, pageNumbers);

        // Create and save the export request record
        String requestId = generateRequestId();
        PdfExportRequest exportRequest = new PdfExportRequest(
            requestId,
            item.getID(),
            bitstream.getID(),
            eperson.getID(),
            eperson.getFullName(),
            nationalId,
            PdfExportRequest.ExportType.FIRST_25_PERCENT
        );
        exportRequest.setTotalPages(totalPages);
        exportRequest.setPagesExported(pagesToExport);
        exportRequest.setIpAddress(ipAddress);
        exportRequest.setItemTitle(itemService.getName(item));
        exportRequest.setBitstreamName(bitstream.getName());

        pdfExportRequestDAO.create(context, exportRequest);

        log.info("Admin PDF export: User {} exported first {}% ({} pages) of bitstream {} from item {}",
                 eperson.getEmail(), (int)(percentageToExport * 100), pagesToExport,
                 bitstream.getID(), item.getID());

        return new ByteArrayInputStream(extractedPdf);
    }

    @Override
    public InputStream exportCustomPages(Context context, Item item, Bitstream bitstream,
                                         EPerson eperson, String nationalId, String ipAddress,
                                         String pageRange, double maxPercentage)
        throws SQLException, IOException, AuthorizeException {

        // Verify authorization
        if (!isAuthorized(context)) {
            throw new AuthorizeException("User is not authorized for admin PDF export");
        }

        // Check for duplicate request
        if (isDuplicateRequest(context, eperson.getID(), bitstream.getID())) {
            throw new IllegalStateException("A duplicate export request was recently submitted");
        }

        // Get the PDF content
        int totalPages;
        byte[] pdfBytes;
        try (InputStream is = bitstreamService.retrieve(context, bitstream)) {
            pdfBytes = IOUtils.toByteArray(is);
            try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdfBytes))) {
                totalPages = document.getNumberOfPages();
            }
        }

        // Parse and validate page range
        List<Integer> pageNumbers = parsePageRange(pageRange, totalPages);

        // Check that pages don't exceed maximum percentage
        int maxAllowedPages = Math.max(1, (int) Math.ceil(totalPages * maxPercentage));
        if (pageNumbers.size() > maxAllowedPages) {
            throw new IllegalArgumentException(
                String.format("Requested %d pages exceeds maximum allowed %d pages (%.0f%% of %d total)",
                              pageNumbers.size(), maxAllowedPages, maxPercentage * 100, totalPages));
        }

        // Extract pages
        byte[] extractedPdf = extractPages(pdfBytes, pageNumbers);

        // Create and save the export request record
        String requestId = generateRequestId();
        PdfExportRequest exportRequest = new PdfExportRequest(
            requestId,
            item.getID(),
            bitstream.getID(),
            eperson.getID(),
            eperson.getFullName(),
            nationalId,
            PdfExportRequest.ExportType.CUSTOM_PAGES
        );
        exportRequest.setTotalPages(totalPages);
        exportRequest.setPagesExported(pageNumbers.size());
        exportRequest.setPagesRequested(pageRange);
        exportRequest.setIpAddress(ipAddress);
        exportRequest.setItemTitle(itemService.getName(item));
        exportRequest.setBitstreamName(bitstream.getName());

        pdfExportRequestDAO.create(context, exportRequest);

        log.info("Admin PDF export: User {} exported custom pages '{}' ({} pages) of bitstream {} from item {}",
                 eperson.getEmail(), pageRange, pageNumbers.size(), bitstream.getID(), item.getID());

        return new ByteArrayInputStream(extractedPdf);
    }

    /**
     * Extract specified pages from a PDF document
     *
     * @param pdfBytes The original PDF bytes
     * @param pageNumbers List of page numbers to extract (1-based)
     * @return Byte array of the extracted PDF
     * @throws IOException if I/O error occurs
     */
    private byte[] extractPages(byte[] pdfBytes, List<Integer> pageNumbers) throws IOException {
        try (PDDocument sourceDocument = PDDocument.load(new ByteArrayInputStream(pdfBytes));
             PDDocument targetDocument = new PDDocument()) {

            for (int pageNum : pageNumbers) {
                // PDFBox uses 0-based index
                int pageIndex = pageNum - 1;
                if (pageIndex >= 0 && pageIndex < sourceDocument.getNumberOfPages()) {
                    PDPage page = sourceDocument.getPage(pageIndex);
                    targetDocument.importPage(page);
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            targetDocument.save(baos);
            return baos.toByteArray();
        }
    }

    @Override
    public List<Integer> parsePageRange(String pageRange, int totalPages) {
        if (pageRange == null || pageRange.trim().isEmpty()) {
            throw new IllegalArgumentException("Page range cannot be empty");
        }

        Set<Integer> pages = new HashSet<>();
        String[] parts = pageRange.split(",");

        for (String part : parts) {
            part = part.trim();
            if (part.contains("-")) {
                String[] range = part.split("-");
                if (range.length != 2) {
                    throw new IllegalArgumentException("Invalid range format: " + part);
                }
                try {
                    int start = Integer.parseInt(range[0].trim());
                    int end = Integer.parseInt(range[1].trim());

                    if (start < 1 || end > totalPages || start > end) {
                        throw new IllegalArgumentException(
                            String.format("Invalid range %d-%d (total pages: %d)", start, end, totalPages));
                    }

                    for (int i = start; i <= end; i++) {
                        pages.add(i);
                    }
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Invalid number in range: " + part);
                }
            } else {
                try {
                    int page = Integer.parseInt(part);
                    if (page < 1 || page > totalPages) {
                        throw new IllegalArgumentException(
                            String.format("Page %d is out of range (total pages: %d)", page, totalPages));
                    }
                    pages.add(page);
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Invalid page number: " + part);
                }
            }
        }

        List<Integer> sortedPages = new ArrayList<>(pages);
        sortedPages.sort(Integer::compareTo);
        return sortedPages;
    }

    @Override
    public boolean isDuplicateRequest(Context context, UUID epersonUuid, UUID bitstreamUuid)
        throws SQLException {
        int windowMinutes = configurationService.getIntProperty(CONFIG_DUPLICATE_WINDOW, 5);
        return pdfExportRequestDAO.existsDuplicateRequest(context, epersonUuid, bitstreamUuid, windowMinutes);
    }

    @Override
    public List<PdfExportRequest> getRequestsByUser(Context context, UUID epersonUuid)
        throws SQLException {
        return pdfExportRequestDAO.findByEperson(context, epersonUuid);
    }

    @Override
    public PdfExportRequest getRequestByRequestId(Context context, String requestId)
        throws SQLException {
        return pdfExportRequestDAO.findByRequestId(context, requestId);
    }

    @Override
    public List<PdfExportRequest> getAllRequests(Context context, int limit, int offset)
        throws SQLException {
        return pdfExportRequestDAO.findAll(context, limit, offset);
    }

    @Override
    public double getPercentageToExport() {
        String value = configurationService.getProperty(CONFIG_PERCENTAGE);
        if (value != null && !value.isEmpty()) {
            try {
                return Double.parseDouble(value);
            } catch (NumberFormatException e) {
                log.warn("Invalid percentage value '{}' for {}, using default 0.25", value, CONFIG_PERCENTAGE);
            }
        }
        return 0.25;
    }

    @Override
    public double getMaxCustomPagesPercentage() {
        String value = configurationService.getProperty(CONFIG_MAX_CUSTOM_PERCENTAGE);
        if (value != null && !value.isEmpty()) {
            try {
                return Double.parseDouble(value);
            } catch (NumberFormatException e) {
                log.warn("Invalid percentage value '{}' for {}, using default 0.25", value, CONFIG_MAX_CUSTOM_PERCENTAGE);
            }
        }
        return 0.25;
    }

    @Override
    public List<String> getAllowedGroups() {
        String[] groups = configurationService.getArrayProperty(CONFIG_ALLOWED_GROUPS);
        if (groups == null || groups.length == 0) {
            return Arrays.asList("Administrator");
        }
        return Arrays.asList(groups);
    }

    /**
     * Generate a unique request ID
     *
     * @return Unique request ID string
     */
    private String generateRequestId() {
        return "PDF-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
