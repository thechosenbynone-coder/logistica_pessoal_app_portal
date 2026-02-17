import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useNotifications({ api, employeeId, intervalMs = 30000 }) {
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState('');
  const lastSinceRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!employeeId) return;
    const since = lastSinceRef.current;
    const incoming = await api.notifications.list(employeeId, since || undefined);
    if (incoming.length > 0) {
      setItems((prev) => [...incoming, ...prev]);
      lastSinceRef.current = incoming[0].createdAt;
      setToast(incoming[0].title || 'Nova notificação');
      setTimeout(() => setToast(''), 3500);
    }
  }, [api, employeeId]);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, intervalMs);
    return () => clearInterval(timer);
  }, [fetchNotifications, intervalMs]);

  const unreadCount = useMemo(() => items.filter((item) => !item.readAt).length, [items]);

  const markRead = useCallback(async (ids) => {
    if (!employeeId || !ids?.length) return;
    await api.notifications.markRead(employeeId, ids);
    setItems((prev) => prev.map((item) => (ids.includes(item.id) ? { ...item, readAt: new Date().toISOString() } : item)));
  }, [api, employeeId]);

  return { items, unreadCount, toast, markRead };
}
