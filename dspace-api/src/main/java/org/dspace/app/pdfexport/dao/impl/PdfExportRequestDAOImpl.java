/**
 * The contents of this file are subject to the license and copyright
 * detailed in the LICENSE and NOTICE files at the root of the source
 * tree and available online at
 *
 * http://www.dspace.org/license/
 */
package org.dspace.app.pdfexport.dao.impl;

import java.sql.SQLException;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.Query;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;
import org.dspace.app.pdfexport.PdfExportRequest;
import org.dspace.app.pdfexport.dao.PdfExportRequestDAO;
import org.dspace.core.AbstractHibernateDAO;
import org.dspace.core.Context;

/**
 * Hibernate implementation of the PdfExportRequestDAO interface.
 * This class is responsible for all database operations related to PDF export requests.
 *
 * @author DSpace
 */
public class PdfExportRequestDAOImpl extends AbstractHibernateDAO<PdfExportRequest>
    implements PdfExportRequestDAO {

    protected PdfExportRequestDAOImpl() {
        super();
    }

    @Override
    public PdfExportRequest findByRequestId(Context context, String requestId) throws SQLException {
        CriteriaBuilder criteriaBuilder = getCriteriaBuilder(context);
        CriteriaQuery<PdfExportRequest> criteriaQuery = criteriaBuilder.createQuery(PdfExportRequest.class);
        Root<PdfExportRequest> root = criteriaQuery.from(PdfExportRequest.class);

        criteriaQuery.select(root);
        criteriaQuery.where(criteriaBuilder.equal(root.get("requestId"), requestId));

        Query query = getHibernateSession(context).createQuery(criteriaQuery);
        List<PdfExportRequest> results = query.getResultList();

        return results.isEmpty() ? null : results.get(0);
    }

    @Override
    public List<PdfExportRequest> findByEperson(Context context, UUID epersonUuid) throws SQLException {
        CriteriaBuilder criteriaBuilder = getCriteriaBuilder(context);
        CriteriaQuery<PdfExportRequest> criteriaQuery = criteriaBuilder.createQuery(PdfExportRequest.class);
        Root<PdfExportRequest> root = criteriaQuery.from(PdfExportRequest.class);

        criteriaQuery.select(root);
        criteriaQuery.where(criteriaBuilder.equal(root.get("epersonUuid"), epersonUuid));
        criteriaQuery.orderBy(criteriaBuilder.desc(root.get("requestDate")));

        Query query = getHibernateSession(context).createQuery(criteriaQuery);
        return query.getResultList();
    }

    @Override
    public List<PdfExportRequest> findByItem(Context context, UUID itemUuid) throws SQLException {
        CriteriaBuilder criteriaBuilder = getCriteriaBuilder(context);
        CriteriaQuery<PdfExportRequest> criteriaQuery = criteriaBuilder.createQuery(PdfExportRequest.class);
        Root<PdfExportRequest> root = criteriaQuery.from(PdfExportRequest.class);

        criteriaQuery.select(root);
        criteriaQuery.where(criteriaBuilder.equal(root.get("itemUuid"), itemUuid));
        criteriaQuery.orderBy(criteriaBuilder.desc(root.get("requestDate")));

        Query query = getHibernateSession(context).createQuery(criteriaQuery);
        return query.getResultList();
    }

    @Override
    public List<PdfExportRequest> findByBitstream(Context context, UUID bitstreamUuid) throws SQLException {
        CriteriaBuilder criteriaBuilder = getCriteriaBuilder(context);
        CriteriaQuery<PdfExportRequest> criteriaQuery = criteriaBuilder.createQuery(PdfExportRequest.class);
        Root<PdfExportRequest> root = criteriaQuery.from(PdfExportRequest.class);

        criteriaQuery.select(root);
        criteriaQuery.where(criteriaBuilder.equal(root.get("bitstreamUuid"), bitstreamUuid));
        criteriaQuery.orderBy(criteriaBuilder.desc(root.get("requestDate")));

        Query query = getHibernateSession(context).createQuery(criteriaQuery);
        return query.getResultList();
    }

    @Override
    public boolean existsDuplicateRequest(Context context, UUID epersonUuid, UUID bitstreamUuid,
                                          int minutesWindow) throws SQLException {
        Calendar calendar = Calendar.getInstance();
        calendar.add(Calendar.MINUTE, -minutesWindow);
        Date cutoffDate = calendar.getTime();

        CriteriaBuilder criteriaBuilder = getCriteriaBuilder(context);
        CriteriaQuery<Long> criteriaQuery = criteriaBuilder.createQuery(Long.class);
        Root<PdfExportRequest> root = criteriaQuery.from(PdfExportRequest.class);

        criteriaQuery.select(criteriaBuilder.count(root));
        criteriaQuery.where(
            criteriaBuilder.and(
                criteriaBuilder.equal(root.get("epersonUuid"), epersonUuid),
                criteriaBuilder.equal(root.get("bitstreamUuid"), bitstreamUuid),
                criteriaBuilder.greaterThanOrEqualTo(root.get("requestDate"), cutoffDate)
            )
        );

        Query query = getHibernateSession(context).createQuery(criteriaQuery);
        Long count = (Long) query.getSingleResult();
        return count > 0;
    }

    @Override
    public List<PdfExportRequest> findAll(Context context, int limit, int offset) throws SQLException {
        CriteriaBuilder criteriaBuilder = getCriteriaBuilder(context);
        CriteriaQuery<PdfExportRequest> criteriaQuery = criteriaBuilder.createQuery(PdfExportRequest.class);
        Root<PdfExportRequest> root = criteriaQuery.from(PdfExportRequest.class);

        criteriaQuery.select(root);
        criteriaQuery.orderBy(criteriaBuilder.desc(root.get("requestDate")));

        Query query = getHibernateSession(context).createQuery(criteriaQuery);
        if (limit > 0) {
            query.setMaxResults(limit);
        }
        if (offset > 0) {
            query.setFirstResult(offset);
        }
        return query.getResultList();
    }

    @Override
    public int countAll(Context context) throws SQLException {
        CriteriaBuilder criteriaBuilder = getCriteriaBuilder(context);
        CriteriaQuery<Long> criteriaQuery = criteriaBuilder.createQuery(Long.class);
        Root<PdfExportRequest> root = criteriaQuery.from(PdfExportRequest.class);

        criteriaQuery.select(criteriaBuilder.count(root));

        Query query = getHibernateSession(context).createQuery(criteriaQuery);
        Long count = (Long) query.getSingleResult();
        return count.intValue();
    }
}
