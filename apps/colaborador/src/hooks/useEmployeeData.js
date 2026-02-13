import { useCallback, useEffect, useState } from 'react';

export function useEmployeeData({ api, employeeId, mockEmployee }) {
  const [employee, setEmployee] = useState(mockEmployee);
  const [loading, setLoading] = useState(false);
  const [screenError, setScreenError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [epiDeliveries, setEpiDeliveries] = useState([]);
  const [dailyReportsApi, setDailyReportsApi] = useState([]);
  const [serviceOrdersApi, setServiceOrdersApi] = useState([]);
  const [financialRequestsApi, setFinancialRequestsApi] = useState([]);

  const refreshLists = useCallback(async (id) => {
    if (!id) return;
    const results = await Promise.allSettled([
      api.dailyReports.listByEmployee(id),
      api.serviceOrders.listByEmployee(id),
      api.financialRequests.listByEmployee(id),
    ]);

    if (results[0].status === 'fulfilled') setDailyReportsApi(results[0].value);
    if (results[1].status === 'fulfilled') setServiceOrdersApi(results[1].value);
    if (results[2].status === 'fulfilled') setFinancialRequestsApi(results[2].value);
  }, [api]);

  const loadEmployeeData = useCallback(async (id, isCancelled = () => false) => {
    if (!id || isCancelled()) return;

    setLoading(true);
    setScreenError('');

    const results = await Promise.allSettled([
      api.employees.get(id),
      api.documents.listByEmployee(id),
      api.deployments.listByEmployee(id),
      api.epiDeliveries.listByEmployee(id),
      api.dailyReports.listByEmployee(id),
      api.serviceOrders.listByEmployee(id),
      api.financialRequests.listByEmployee(id),
    ]);

    if (isCancelled()) return;

    const hasFailures = results.some((item) => item.status === 'rejected');
    if (hasFailures) setScreenError('Alguns dados do Portal RH não carregaram.');

    if (results[0].status === 'fulfilled' && results[0].value) {
      const employeeData = results[0].value;
      setEmployee((prev) => ({ ...prev, ...employeeData, registration: String(employeeData.id || id) }));
    }
    if (results[1].status === 'fulfilled') setDocuments(results[1].value);
    if (results[2].status === 'fulfilled') setDeployments(results[2].value);
    if (results[3].status === 'fulfilled') setEpiDeliveries(results[3].value);
    if (results[4].status === 'fulfilled') setDailyReportsApi(results[4].value);
    if (results[5].status === 'fulfilled') setServiceOrdersApi(results[5].value);
    if (results[6].status === 'fulfilled') setFinancialRequestsApi(results[6].value);

    if (isCancelled()) return;
    setLoading(false);
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    loadEmployeeData(employeeId, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [employeeId, loadEmployeeData]);

  return {
    employee,
    loading,
    screenError,
    documents,
    deployments,
    epiDeliveries,
    dailyReportsApi,
    serviceOrdersApi,
    financialRequestsApi,
    refreshLists,
    loadEmployeeData,
  };
}
