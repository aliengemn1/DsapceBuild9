/**
 * The contents of this file are subject to the license and copyright
 * detailed in the LICENSE and NOTICE files at the root of the source
 * tree and available online at
 *
 * http://www.dspace.org/license/
 */
package org.dspace.app.pdfexport;

import java.util.Date;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;

/**
 * Entity class representing a PDF export request from an admin user.
 * This tracks all PDF export operations for auditing purposes.
 *
 * @author DSpace
 */
@Entity
@Table(name = "pdf_export_request")
public class PdfExportRequest {

    /**
     * Export type enumeration
     */
    public enum ExportType {
        FIRST_25_PERCENT,
        CUSTOM_PAGES
    }

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id")
    private UUID id;

    @Column(name = "request_id", unique = true, nullable = false, length = 50)
    private String requestId;

    @Column(name = "item_uuid", nullable = false)
    private UUID itemUuid;

    @Column(name = "bitstream_uuid", nullable = false)
    private UUID bitstreamUuid;

    @Column(name = "eperson_uuid", nullable = false)
    private UUID epersonUuid;

    @Column(name = "eperson_name", nullable = false, length = 255)
    private String epersonName;

    @Column(name = "national_id", nullable = false, length = 20)
    private String nationalId;

    @Enumerated(EnumType.STRING)
    @Column(name = "export_type", nullable = false, length = 20)
    private ExportType exportType;

    @Column(name = "pages_requested", length = 500)
    private String pagesRequested;

    @Column(name = "pages_exported")
    private Integer pagesExported;

    @Column(name = "total_pages")
    private Integer totalPages;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "request_date", nullable = false)
    private Date requestDate;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "item_title", length = 500)
    private String itemTitle;

    @Column(name = "bitstream_name", length = 255)
    private String bitstreamName;

    /**
     * Protected constructor for JPA
     */
    protected PdfExportRequest() {
    }

    /**
     * Create a new PDF export request
     */
    public PdfExportRequest(String requestId, UUID itemUuid, UUID bitstreamUuid,
                            UUID epersonUuid, String epersonName, String nationalId,
                            ExportType exportType) {
        this.requestId = requestId;
        this.itemUuid = itemUuid;
        this.bitstreamUuid = bitstreamUuid;
        this.epersonUuid = epersonUuid;
        this.epersonName = epersonName;
        this.nationalId = nationalId;
        this.exportType = exportType;
        this.requestDate = new Date();
    }

    // Getters and Setters

    public UUID getId() {
        return id;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public UUID getItemUuid() {
        return itemUuid;
    }

    public void setItemUuid(UUID itemUuid) {
        this.itemUuid = itemUuid;
    }

    public UUID getBitstreamUuid() {
        return bitstreamUuid;
    }

    public void setBitstreamUuid(UUID bitstreamUuid) {
        this.bitstreamUuid = bitstreamUuid;
    }

    public UUID getEpersonUuid() {
        return epersonUuid;
    }

    public void setEpersonUuid(UUID epersonUuid) {
        this.epersonUuid = epersonUuid;
    }

    public String getEpersonName() {
        return epersonName;
    }

    public void setEpersonName(String epersonName) {
        this.epersonName = epersonName;
    }

    public String getNationalId() {
        return nationalId;
    }

    public void setNationalId(String nationalId) {
        this.nationalId = nationalId;
    }

    public ExportType getExportType() {
        return exportType;
    }

    public void setExportType(ExportType exportType) {
        this.exportType = exportType;
    }

    public String getPagesRequested() {
        return pagesRequested;
    }

    public void setPagesRequested(String pagesRequested) {
        this.pagesRequested = pagesRequested;
    }

    public Integer getPagesExported() {
        return pagesExported;
    }

    public void setPagesExported(Integer pagesExported) {
        this.pagesExported = pagesExported;
    }

    public Integer getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(Integer totalPages) {
        this.totalPages = totalPages;
    }

    public Date getRequestDate() {
        return requestDate;
    }

    public void setRequestDate(Date requestDate) {
        this.requestDate = requestDate;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getItemTitle() {
        return itemTitle;
    }

    public void setItemTitle(String itemTitle) {
        this.itemTitle = itemTitle;
    }

    public String getBitstreamName() {
        return bitstreamName;
    }

    public void setBitstreamName(String bitstreamName) {
        this.bitstreamName = bitstreamName;
    }

    @Override
    public String toString() {
        return "PdfExportRequest{" +
               "id=" + id +
               ", requestId='" + requestId + '\'' +
               ", itemUuid=" + itemUuid +
               ", bitstreamUuid=" + bitstreamUuid +
               ", epersonName='" + epersonName + '\'' +
               ", exportType=" + exportType +
               ", requestDate=" + requestDate +
               '}';
    }
}
