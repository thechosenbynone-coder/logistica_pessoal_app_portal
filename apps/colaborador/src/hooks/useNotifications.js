import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function toCreatedAtMs(value) {
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function toNotificationKey(id) {
  const numericId = Number(id);
  if (Number.isFinite(numericId)) return `n:${numericId}`;
  return `s:${String(id ?? '')}`;
}

export function useNotifications({ api, employeeId, intervalMs = 30000 }) {
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState('');
  const lastSinceRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!employeeId) return;

    const since = lastSinceRef.current;
    const incoming = await api.notifications.list(employeeId, since || undefined);

    if (!incoming.length) return;

    const latestIncoming = [...incoming].sort(
      (a, b) => toCreatedAtMs(b?.createdAt) - toCreatedAtMs(a?.createdAt)
    )[0];

    const latestCreatedAtMs = incoming.reduce((acc, item) => {
      const currentMs = toCreatedAtMs(item?.createdAt);
      return currentMs > acc ? currentMs : acc;
    }, toCreatedAtMs(lastSinceRef.current));

    if (latestCreatedAtMs > 0) {
      lastSinceRef.current = new Date(latestCreatedAtMs).toISOString();
    }

    setToast(latestIncoming?.title || 'Nova notificação');
    setTimeout(() => setToast(''), 3500);

    setItems((prev) => {
      const merged = [...incoming, ...prev];
      const uniqueById = new Map();

      merged.forEach((item) => {
        uniqueById.set(toNotificationKey(item?.id), item);
      });

      return Array.from(uniqueById.values()).sort(
        (a, b) => toCreatedAtMs(b?.createdAt) - toCreatedAtMs(a?.createdAt)
      );
    });
  }, [api, employeeId]);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, intervalMs);
    return () => clearInterval(timer);
  }, [fetchNotifications, intervalMs]);

  const unreadCount = useMemo(() => items.filter((item) => !item.readAt).length, [items]);

  const markRead = useCallback(
    async (ids) => {
      if (!employeeId || !ids?.length) return;

      const numericIds = ids.map((id) => Number(id)).filter((id) => Number.isFinite(id));
      if (!numericIds.length) return;

      await api.notifications.markRead(employeeId, numericIds);

      const numericSet = new Set(numericIds);
      const readAt = new Date().toISOString();
      setItems((prev) =>
        prev.map((item) => {
          const itemId = Number(item?.id);
          if (!Number.isFinite(itemId)) return item;
          return numericSet.has(itemId) ? { ...item, readAt } : item;
        })
      );
    },
    [api, employeeId]
  );

  return { items, unreadCount, toast, markRead };
}
