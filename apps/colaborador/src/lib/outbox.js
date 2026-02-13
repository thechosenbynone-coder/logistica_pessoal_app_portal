const OUTBOX_KEY = 'el_outbox_v1';
const SENDING_STALE_MS = 5 * 60 * 1000;

const nowISO = () => new Date().toISOString();

const genId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `ob_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

const getDelayMs = (attempts) => {
  if (attempts <= 1) return 10_000;
  if (attempts === 2) return 30_000;
  if (attempts === 3) return 120_000;
  return 300_000;
};

const readOutbox = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeOutbox = (items) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
};

export const outboxList = () => readOutbox();

export const outboxEnqueue = (kind, employee_id, payload, clientFilledAtISO, clientIdOpt) => {
  const createdAt = nowISO();
  const clientId = clientIdOpt || payload?.client_id || genId();
  const normalizedPayload = {
    ...payload,
    client_id: clientId,
    client_filled_at: clientFilledAtISO,
  };

  const current = readOutbox();
  const duplicate = current.find(
    (entry) =>
      entry.employee_id === employee_id &&
      entry.kind === kind &&
      (entry.client_id === clientId || entry.payload?.client_id === clientId)
  );
  if (duplicate) return duplicate;

  const item = {
    id: genId(),
    kind,
    employee_id,
    payload: normalizedPayload,
    client_id: clientId,
    client_filled_at: clientFilledAtISO,
    created_at: createdAt,
    status: 'PENDING',
    sending_at: null,
    attempts: 0,
    last_error: '',
    next_retry_at: createdAt,
  };

  const updated = [item, ...current];
  writeOutbox(updated);
  return item;
};

export const outboxRetry = (itemId) => {
  const items = readOutbox();
  const updated = items.map((item) =>
    item.id === itemId
      ? { ...item, status: 'PENDING', sending_at: null, next_retry_at: nowISO(), last_error: '' }
      : item
  );
  writeOutbox(updated);
  return updated;
};

export const outboxRemove = (itemId) => {
  const updated = readOutbox().filter((item) => item.id !== itemId);
  writeOutbox(updated);
  return updated;
};

const canTryNow = (item, now) => {
  if (item.status === 'SENDING') {
    if (!item.sending_at) return false;
    const sendingSince = new Date(item.sending_at).getTime();
    return Number.isFinite(sendingSince) && now.getTime() - sendingSince > SENDING_STALE_MS;
  }
  if (!item.next_retry_at) return true;
  return new Date(item.next_retry_at).getTime() <= now.getTime();
};

const sendByKind = async (api, item) => {
  if (item.kind === 'RDO') return api.dailyReports.create(item.payload);
  if (item.kind === 'OS') return api.serviceOrders.create(item.payload);
  if (item.kind === 'FIN') return api.financialRequests.create(item.payload);
  throw new Error(`Kind inválido: ${item.kind}`);
};

export const outboxFlush = async (api) => {
  const now = new Date();
  const items = readOutbox();
  let working = [...items];

  for (let i = 0; i < working.length; i += 1) {
    const item = working[i];
    if (!canTryNow(item, now)) continue;

    working[i] = { ...item, status: 'SENDING', sending_at: nowISO() };
    writeOutbox(working);

    try {
      await sendByKind(api, item);
      working = working.filter((entry) => entry.id !== item.id);
      i -= 1;
      writeOutbox(working);
    } catch (error) {
      if (error?.status === 409) {
        working = working.filter((entry) => entry.id !== item.id);
        i -= 1;
        writeOutbox(working);
        continue;
      }

      const attempts = (item.attempts || 0) + 1;
      const delayMs = getDelayMs(attempts);
      const retryAt = new Date(Date.now() + delayMs).toISOString();
      working[i] = {
        ...item,
        status: 'FAILED',
        sending_at: null,
        attempts,
        last_error: error?.message || 'Erro de envio',
        next_retry_at: retryAt,
      };
      writeOutbox(working);
    }
  }

  return working;
};
