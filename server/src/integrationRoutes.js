import { addNotification, composeJourney, newId, readStore, writeStore } from './integrationStore.js';

const REQUEST_TYPES = new Set(['os', 'rdo', 'finance', 'lodging', 'epi']);

const byDateAsc = (a, b) => new Date(a.embarkDate).getTime() - new Date(b.embarkDate).getTime();

export function registerIntegrationRoutes(app) {
  app.get('/api/employees/:employeeId', (req, res, next) => {
    const { employeeId } = req.params;
    const store = readStore();
    const employee = store.employees.find((item) => Number(item.id) === Number(employeeId));
    if (!employee) return next();
    return res.json(employee);
  });

  app.get('/api/employees/:employeeId/embarkations/current', (req, res) => {
    const employeeId = Number(req.params.employeeId);
    const store = readStore();
    const assigned = store.embarkationAssignments
      .filter((item) => Number(item.employeeId) === employeeId)
      .map((item) => store.embarkations.find((e) => Number(e.id) === Number(item.embarkationId)))
      .filter(Boolean)
      .sort(byDateAsc);

    const today = new Date();
    const current = assigned.find((emb) => new Date(emb.embarkDate) <= today && new Date(emb.disembarkDate) >= today) || assigned[0] || null;
    res.json(current);
  });

  app.get('/api/employees/:employeeId/embarkations/next', (req, res) => {
    const employeeId = Number(req.params.employeeId);
    const store = readStore();
    const today = new Date();
    const nextEmb = store.embarkationAssignments
      .filter((item) => Number(item.employeeId) === employeeId)
      .map((item) => store.embarkations.find((e) => Number(e.id) === Number(item.embarkationId)))
      .filter(Boolean)
      .filter((emb) => new Date(emb.embarkDate) > today)
      .sort(byDateAsc)[0] || null;
    res.json(nextEmb);
  });

  app.get('/api/embarkations/:embarkationId/journey', (req, res) => {
    const embarkationId = Number(req.params.embarkationId);
    const employeeId = Number(req.query.employeeId || req.query.employee_id || 1);
    const store = readStore();
    res.json(composeJourney(store, employeeId, embarkationId));
  });

  app.put('/api/embarkations/:embarkationId/journey', (req, res) => {
    const embarkationId = Number(req.params.embarkationId);
    const employeeId = Number(req.body?.employeeId);
    const steps = Array.isArray(req.body?.steps) ? req.body.steps : [];

    if (!employeeId) return res.status(400).json({ message: 'employeeId obrigatório' });

    const store = readStore();
    store.journeyStatus[`${employeeId}:${embarkationId}`] = steps.map((step) => ({ key: step.key, status: step.status || 'pending' }));
    writeStore(store);
    res.json(composeJourney(store, employeeId, embarkationId));
  });

  app.get('/api/employees/:employeeId/trainings', (req, res) => {
    const employeeId = Number(req.params.employeeId);
    const statusFilter = String(req.query.status || '').toLowerCase();
    const store = readStore();
    let items = store.trainingAssignments
      .filter((item) => Number(item.employeeId) === employeeId)
      .map((item) => store.trainings.find((t) => Number(t.id) === Number(item.trainingId)))
      .filter(Boolean);

    if (statusFilter) items = items.filter((item) => String(item.status || '').toLowerCase() === statusFilter);
    res.json(items);
  });

  app.get('/api/employees/:employeeId/documents', (req, res, next) => {
    const employeeId = Number(req.params.employeeId);
    const store = readStore();
    const docs = store.documents.filter((item) => Number(item.employeeId) === employeeId);
    if (!docs.length) return next();
    return res.json(docs);
  });

  REQUEST_TYPES.forEach((type) => {
    app.post(`/api/requests/${type}`, (req, res) => {
      const employeeId = Number(req.body?.employeeId || req.body?.employee_id);
      if (!employeeId) return res.status(400).json({ message: 'employeeId obrigatório' });
      const store = readStore();
      const requestItem = {
        id: newId(store.requests),
        employeeId,
        type,
        payload: req.body?.payload || req.body || {},
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      store.requests.unshift(requestItem);
      writeStore(store);
      res.status(201).json(requestItem);
    });
  });

  app.get('/api/employees/:employeeId/requests', (req, res) => {
    const employeeId = Number(req.params.employeeId);
    const typeFilter = String(req.query.type || '').toLowerCase();
    const store = readStore();
    let items = store.requests.filter((item) => Number(item.employeeId) === employeeId);
    if (typeFilter) items = items.filter((item) => String(item.type).toLowerCase() === typeFilter);
    res.json(items);
  });

  app.get('/api/employees/:employeeId/notifications', (req, res) => {
    const employeeId = Number(req.params.employeeId);
    const since = req.query.since ? new Date(String(req.query.since)) : null;
    const store = readStore();
    let items = store.notifications.filter((item) => Number(item.employeeId) === employeeId);
    if (since && !Number.isNaN(since.getTime())) {
      items = items.filter((item) => new Date(item.createdAt) > since);
    }
    res.json(items);
  });

  app.post('/api/employees/:employeeId/notifications/read', (req, res) => {
    const employeeId = Number(req.params.employeeId);
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : [];
    const store = readStore();
    const now = new Date().toISOString();
    store.notifications = store.notifications.map((item) => {
      if (Number(item.employeeId) !== employeeId) return item;
      if (!ids.includes(Number(item.id))) return item;
      return { ...item, readAt: now };
    });
    writeStore(store);
    res.json({ ok: true, updated: ids.length });
  });

  // Admin/demo routes for Portal RH as source-of-truth
  app.post('/api/admin/embarkations', (req, res) => {
    const store = readStore();
    const body = req.body || {};
    const embarkation = {
      id: newId(store.embarkations),
      destination: body.destination,
      location: body.location,
      embarkDate: body.embarkDate,
      disembarkDate: body.disembarkDate,
      status: body.status || 'scheduled',
      vessel: body.vessel || null,
    };

    const employeeIds = Array.isArray(body.employeeIds) ? body.employeeIds.map(Number) : [];
    const journeyTemplate = Array.isArray(body.journeyTemplate) ? body.journeyTemplate : [];

    store.embarkations.push(embarkation);
    employeeIds.forEach((employeeId) => {
      store.embarkationAssignments.push({ employeeId, embarkationId: embarkation.id });
      store.journeyStatus[`${employeeId}:${embarkation.id}`] = journeyTemplate.map((s) => ({ key: s.key, status: 'pending' }));
      addNotification(store, employeeId, 'EMBARKATION', 'Embarque atualizado', `Novo embarque programado para ${embarkation.destination}`);
    });
    store.journeyTemplates[String(embarkation.id)] = journeyTemplate;

    writeStore(store);
    res.status(201).json({ embarkation, employeeIds, journeyTemplate });
  });

  app.post('/api/admin/trainings', (req, res) => {
    const store = readStore();
    const body = req.body || {};
    const training = {
      id: newId(store.trainings),
      title: body.title,
      date: body.date,
      location: body.location,
      status: body.status || 'scheduled',
      notes: body.notes || '',
      attachments: body.attachments || [],
    };
    const employeeIds = Array.isArray(body.employeeIds) ? body.employeeIds.map(Number) : [];
    store.trainings.push(training);
    employeeIds.forEach((employeeId) => {
      store.trainingAssignments.push({ employeeId, trainingId: training.id });
      addNotification(store, employeeId, 'TRAINING', 'Novo treinamento', `${training.title} em ${training.date}`);
    });
    writeStore(store);
    res.status(201).json({ training, employeeIds });
  });

  app.post('/api/admin/documents', (req, res) => {
    const store = readStore();
    const body = req.body || {};
    const document = {
      id: newId(store.documents),
      employeeId: Number(body.employeeId),
      title: body.title,
      category: body.category || 'certification',
      issuer: body.issuer || '',
      issueDate: body.issueDate || null,
      expiryDate: body.expiryDate || null,
      fileUrl: body.fileUrl,
    };
    store.documents.push(document);
    addNotification(store, document.employeeId, 'DOCUMENT', 'Documento atualizado', `${document.title} disponível`);
    writeStore(store);
    res.status(201).json(document);
  });
}
