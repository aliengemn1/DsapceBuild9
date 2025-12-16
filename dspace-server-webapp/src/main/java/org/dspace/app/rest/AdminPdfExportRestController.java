/**
 * The contents of this file are subject to the license and copyright
 * detailed in the LICENSE and NOTICE files at the root of the source
 * tree and available online at
 *
 * http://www.dspace.org/license/
 */
package org.dspace.app.rest;

import java.io.IOException;
import java.io.InputStream;
import java.sql.SQLException;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.dspace.app.pdfexport.service.PdfExportService;
import org.dspace.app.rest.exception.DSpaceBadRequestException;
import org.dspace.app.rest.exception.UnprocessableEntityException;
import org.dspace.app.rest.utils.ContextUtil;
import org.dspace.authorize.AuthorizeException;
import org.dspace.content.Bitstream;
import org.dspace.content.Item;
import org.dspace.content.service.BitstreamService;
import org.dspace.content.service.ItemService;
import org.dspace.core.Context;
import org.dspace.eperson.EPerson;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.rest.webmvc.ResourceNotFoundException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for Admin PDF Export functionality.
 * Provides endpoints for authorized admin users to export portions of PDF files.
 *
 * @author DSpace
 */
@RestController
@RequestMapping("/api/admin-pdf-export")
public class AdminPdfExportRestController {

    private static final Logger log = LogManager.getLogger(AdminPdfExportRestController.class);

    @Autowired
    private PdfExportService pdfExportService;

    @Autowired
    private ItemService itemService;

    @Autowired
    private BitstreamService bitstreamService;

    /**
     * DTO for PDF export request
     */
    public static class PdfExportRequestDTO {
        private String itemUuid;
        private String bitstreamUuid;
        private String exportType; // "first_25_percent" or "custom_pages"
        private String nationalId;
        private String pagesRequested; // Page range for custom_pages type

        public String getItemUuid() {
            return itemUuid;
        }

        public void setItemUuid(String itemUuid) {
            this.itemUuid = itemUuid;
        }

        public String getBitstreamUuid() {
            return bitstreamUuid;
        }

        public void setBitstreamUuid(String bitstreamUuid) {
            this.bitstreamUuid = bitstreamUuid;
        }

        public String getExportType() {
            return exportType;
        }

        public void setExportType(String exportType) {
            this.exportType = exportType;
        }

        public String getNationalId() {
            return nationalId;
        }

        public void setNationalId(String nationalId) {
            this.nationalId = nationalId;
        }

        public String getPagesRequested() {
            return pagesRequested;
        }

        public void setPagesRequested(String pagesRequested) {
            this.pagesRequested = pagesRequested;
        }
    }

    /**
     * Export PDF pages based on the request parameters.
     *
     * @param request HTTP servlet request
     * @param response HTTP servlet response
     * @param requestDTO Export request parameters
     * @return ResponseEntity with PDF content
     */
    @PostMapping(produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> exportPdf(
            HttpServletRequest request,
            HttpServletResponse response,
            @RequestBody PdfExportRequestDTO requestDTO) {

        Context context = ContextUtil.obtainContext(request);

        try {
            // Validate required fields
            if (requestDTO.getItemUuid() == null || requestDTO.getItemUuid().isEmpty()) {
                throw new DSpaceBadRequestException("Item UUID is required");
            }
            if (requestDTO.getBitstreamUuid() == null || requestDTO.getBitstreamUuid().isEmpty()) {
                throw new DSpaceBadRequestException("Bitstream UUID is required");
            }
            if (requestDTO.getExportType() == null || requestDTO.getExportType().isEmpty()) {
                throw new DSpaceBadRequestException("Export type is required");
            }
            if (requestDTO.getNationalId() == null || requestDTO.getNationalId().isEmpty()) {
                throw new DSpaceBadRequestException("National ID is required");
            }

            // Validate national ID format (10 digits)
            if (!requestDTO.getNationalId().matches("^[0-9]{10}$")) {
                throw new DSpaceBadRequestException("National ID must be 10 digits");
            }

            // Check authorization
            if (!pdfExportService.isAuthorized(context)) {
                throw new AuthorizeException("User is not authorized for admin PDF export");
            }

            // Parse UUIDs
            UUID itemUuid;
            UUID bitstreamUuid;
            try {
                itemUuid = UUID.fromString(requestDTO.getItemUuid());
                bitstreamUuid = UUID.fromString(requestDTO.getBitstreamUuid());
            } catch (IllegalArgumentException e) {
                throw new DSpaceBadRequestException("Invalid UUID format");
            }

            // Find item and bitstream
            Item item = itemService.find(context, itemUuid);
            if (item == null) {
                throw new ResourceNotFoundException("Item not found: " + itemUuid);
            }

            Bitstream bitstream = bitstreamService.find(context, bitstreamUuid);
            if (bitstream == null) {
                throw new ResourceNotFoundException("Bitstream not found: " + bitstreamUuid);
            }

            // Verify it's a PDF
            if (!pdfExportService.isPdfBitstream(context, bitstream)) {
                throw new DSpaceBadRequestException("The specified bitstream is not a PDF file");
            }

            // Get current user
            EPerson currentUser = context.getCurrentUser();
            if (currentUser == null) {
                throw new AuthorizeException("User must be authenticated");
            }

            // Get client IP address
            String ipAddress = getClientIpAddress(request);

            // Process the export request
            InputStream pdfStream;
            String exportType = requestDTO.getExportType();

            if ("first_25_percent".equals(exportType)) {
                double percentageToExport = pdfExportService.getPercentageToExport();
                pdfStream = pdfExportService.exportFirstPercentage(
                    context, item, bitstream, currentUser,
                    requestDTO.getNationalId(), ipAddress, percentageToExport
                );
            } else if ("custom_pages".equals(exportType)) {
                if (requestDTO.getPagesRequested() == null || requestDTO.getPagesRequested().isEmpty()) {
                    throw new DSpaceBadRequestException("Page range is required for custom pages export");
                }
                double maxPercentage = pdfExportService.getMaxCustomPagesPercentage();
                pdfStream = pdfExportService.exportCustomPages(
                    context, item, bitstream, currentUser,
                    requestDTO.getNationalId(), ipAddress,
                    requestDTO.getPagesRequested(), maxPercentage
                );
            } else {
                throw new DSpaceBadRequestException("Invalid export type. Must be 'first_25_percent' or 'custom_pages'");
            }

            // Convert stream to byte array
            byte[] pdfBytes = IOUtils.toByteArray(pdfStream);
            pdfStream.close();

            // Generate filename
            String originalName = bitstream.getName();
            String exportFilename;
            if (originalName != null && originalName.toLowerCase().endsWith(".pdf")) {
                exportFilename = originalName.substring(0, originalName.length() - 4) +
                                 "_export_" + System.currentTimeMillis() + ".pdf";
            } else {
                exportFilename = "export_" + System.currentTimeMillis() + ".pdf";
            }

            // Build response
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", exportFilename);
            headers.setContentLength(pdfBytes.length);

            // Commit context to save the export request record
            context.commit();

            log.info("Admin PDF export completed: User {} exported {} from bitstream {}",
                     currentUser.getEmail(), exportType, bitstreamUuid);

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (AuthorizeException e) {
            log.warn("Authorization failed for PDF export: {}", e.getMessage());
            throw new org.springframework.security.access.AccessDeniedException(e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid argument in PDF export request: {}", e.getMessage());
            throw new DSpaceBadRequestException(e.getMessage());
        } catch (IllegalStateException e) {
            log.warn("Duplicate PDF export request: {}", e.getMessage());
            throw new UnprocessableEntityException(e.getMessage());
        } catch (SQLException e) {
            log.error("Database error during PDF export", e);
            throw new RuntimeException("Database error: " + e.getMessage(), e);
        } catch (IOException e) {
            log.error("I/O error during PDF export", e);
            throw new RuntimeException("Error processing PDF: " + e.getMessage(), e);
        }
    }

    /**
     * Get the client's IP address from the request, considering proxies
     *
     * @param request HTTP servlet request
     * @return Client IP address
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // Take the first IP in the list (original client)
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }
}
