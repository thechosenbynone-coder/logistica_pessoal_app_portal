import { useCallback, useEffect, useState } from 'react';
import { outboxFlush } from '../lib/outbox';

export function useOutboxSync({ api, employeeId, refreshLists, onTick }) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const flushOutbox = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    await outboxFlush(api);
    onTick?.();
    if (employeeId) await refreshLists(employeeId);
  }, [api, employeeId, onTick, refreshLists]);

  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true);
      await flushOutbox();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [flushOutbox]);

  return { isOnline, flushOutbox };
}
