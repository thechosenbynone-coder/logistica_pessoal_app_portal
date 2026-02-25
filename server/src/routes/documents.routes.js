import express from 'express';
import { prisma } from '../prismaClient.js';
import { computeEmployeeDocStatus } from '../services/employeeDocStatus.js';
import { employeeParamsAuth, handleServerError, mapDocument, mapDocumentType, parseDateInputOrError, parseEmployeeIdParam, parseOptionalBoolean, parseRequiredInteger, requireAdminKeyIfConfigured, resolvePagination, shouldUsePaginatedResponse } from '../helpers.js';

const router = express.Router();

router.get('/api/document-types', async (_req, res) => { try { const rows = await prisma.documentType.findMany({ orderBy: { id: 'asc' } }); res.json(rows.map(mapDocumentType)); } catch (error) { handleServerError(res, error, 'document-types-list'); } });
router.post('/api/document-types', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const { code, name, category, requires_expiration } = req.body || {};
    if (!code || !name) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'code e name são obrigatórios' });
    const parsedRequiresExpiration = parseOptionalBoolean(requires_expiration, 'requires_expiration');
    if (parsedRequiresExpiration?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: parsedRequiresExpiration.error });
    const row = await prisma.documentType.create({ data: { code, name, category, requiresExpiration: parsedRequiresExpiration ? parsedRequiresExpiration.value : undefined } });
    res.status(201).json(mapDocumentType(row));
  } catch (error) { handleServerError(res, error, 'document-types-create'); }
});

router.get('/api/documents', async (req, res) => {
  try {
    if (!shouldUsePaginatedResponse(req.query)) {
      const rows = await prisma.document.findMany({ include: { documentType: true }, orderBy: { id: 'asc' } });
      return res.json(rows.map(mapDocument));
    }

    const { page, pageSize, q } = resolvePagination(req.query);
    const where = q
      ? {
          OR: [
            { notes: { contains: q, mode: 'insensitive' } },
            { evidenceRef: { contains: q, mode: 'insensitive' } },
            { evidenceType: { contains: q, mode: 'insensitive' } },
            { documentType: { is: { name: { contains: q, mode: 'insensitive' } } } },
            { documentType: { is: { code: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : undefined;

    const total = await prisma.document.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const rows = await prisma.document.findMany({
      where,
      include: { documentType: true },
      orderBy: { id: 'asc' },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return res.json({
      items: rows.map(mapDocument),
      page: safePage,
      pageSize,
      total,
      totalPages,
      hasMore: safePage < totalPages,
    });
  } catch (error) { handleServerError(res, error, 'documents-list'); }
});
router.get('/api/employees/:id/documents', ...employeeParamsAuth, async (req, res) => {
  try { const employeeId = parseEmployeeIdParam(req, res); if (!employeeId) return; const rows = await prisma.document.findMany({ where: { employeeId }, include: { documentType: true }, orderBy: { id: 'asc' } }); res.json(rows.map(mapDocument)); }
  catch (error) { handleServerError(res, error, 'documents-by-employee'); }
});
router.post('/api/documents', requireAdminKeyIfConfigured, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.employee_id || !data.document_type_id || !data.issue_date) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'employee_id, document_type_id, issue_date são obrigatórios' });
    const employeeIdParsed = parseRequiredInteger(data.employee_id, 'employee_id'); if (employeeIdParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: employeeIdParsed.error });
    const documentTypeIdParsed = parseRequiredInteger(data.document_type_id, 'document_type_id'); if (documentTypeIdParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: documentTypeIdParsed.error });
    const issueDateParsed = parseDateInputOrError(data.issue_date, 'issue_date', true);
    if (issueDateParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: issueDateParsed.error });

    const expirationDateParsed = parseDateInputOrError(data.expiration_date, 'expiration_date');
    if (expirationDateParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: expirationDateParsed.error });

    const verifiedAtParsed = parseDateInputOrError(data.verified_at, 'verified_at');
    if (verifiedAtParsed.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: verifiedAtParsed.error });

    const documentType = await prisma.documentType.findUnique({ where: { id: documentTypeIdParsed.value } });
    if (!documentType) return res.status(404).json({ errorCode: 'NOT_FOUND', message: 'Tipo de documento não encontrado' });
    if (documentType.requiresExpiration && !data.expiration_date) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'expiration_date é obrigatório para este tipo de documento' });

    const parsedVerified = parseOptionalBoolean(data.verified, 'verified');
    if (parsedVerified?.error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: parsedVerified.error });

    const row = await prisma.document.upsert({
      where: { employeeId_documentTypeId: { employeeId: employeeIdParsed.value, documentTypeId: documentTypeIdParsed.value } },
      create: {
        employeeId: employeeIdParsed.value,
        documentTypeId: documentTypeIdParsed.value,
        issueDate: issueDateParsed.value,
        expirationDate: documentType.requiresExpiration ? expirationDateParsed.value : null,
        fileUrl: data.file_url || null,
        evidenceType: data.evidence_type || null,
        evidenceRef: data.evidence_ref || null,
        notes: data.notes || null,
        verified: parsedVerified ? parsedVerified.value : false,
        verifiedBy: data.verified_by || null,
        verifiedAt: verifiedAtParsed.value || (parsedVerified?.value ? new Date() : null),
      },
      update: {
        issueDate: issueDateParsed.value,
        expirationDate: documentType.requiresExpiration ? expirationDateParsed.value : null,
        fileUrl: data.file_url || null,
        evidenceType: data.evidence_type || null,
        evidenceRef: data.evidence_ref || null,
        notes: data.notes || null,
        verified: parsedVerified ? parsedVerified.value : false,
        verifiedBy: data.verified_by || null,
        verifiedAt: verifiedAtParsed.value || (parsedVerified?.value ? new Date() : null),
      },
      include: { documentType: true },
    });

    await computeEmployeeDocStatus(employeeIdParsed.value);
    res.status(201).json(mapDocument(row));
  } catch (error) { handleServerError(res, error, 'documents-create'); }
});

export default router;
