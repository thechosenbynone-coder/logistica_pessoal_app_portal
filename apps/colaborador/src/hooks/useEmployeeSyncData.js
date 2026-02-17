import { useCallback, useEffect, useState } from 'react';

export function useEmployeeSyncData({ api, employeeId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employee, setEmployee] = useState(null);
  const [currentEmbarkation, setCurrentEmbarkation] = useState(null);
  const [nextEmbarkation, setNextEmbarkation] = useState(null);
  const [journey, setJourney] = useState([]);
  const [trainingsScheduled, setTrainingsScheduled] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [requests, setRequests] = useState([]);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError('');

    try {
      const [emp, current, next, trainings, docs, reqs] = await Promise.all([
        api.employees.get(employeeId),
        api.embarkations.getCurrent(employeeId),
        api.embarkations.getNext(employeeId),
        api.trainings.list(employeeId, 'scheduled'),
        api.documents.list(employeeId),
        api.requests.listByEmployee(employeeId),
      ]);

      setEmployee(emp || null);
      setCurrentEmbarkation(current || null);
      setNextEmbarkation(next || null);
      setTrainingsScheduled(trainings || []);
      setDocuments(docs || []);
      setRequests(reqs || []);

      if (current?.id) {
        const j = await api.journey.get(current.id, employeeId);
        setJourney(j || []);
      } else {
        setJourney([]);
      }
    } catch (err) {
      setError('Não foi possível carregar dados de sincronização.');
      console.error('[useEmployeeSyncData]', err);
    } finally {
      setLoading(false);
    }
  }, [api, employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateJourney = useCallback(
    async (steps) => {
      if (!currentEmbarkation?.id) return [];
      const updated = await api.journey.update(currentEmbarkation.id, Number(employeeId), steps);
      setJourney(updated || []);
      return updated || [];
    },
    [api, currentEmbarkation?.id, employeeId]
  );

  return {
    loading,
    error,
    employee,
    currentEmbarkation,
    nextEmbarkation,
    journey,
    trainingsScheduled,
    documents,
    requests,
    refresh: load,
    updateJourney,
  };
}
