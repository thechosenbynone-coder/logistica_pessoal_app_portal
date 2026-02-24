import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Card from '../../ui/Card';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import api from '../../services/api';

const PAGE_SIZE = 25;

function normalizePaginatedResponse(data, fallbackPage = 1) {
  if (Array.isArray(data)) {
    return { items: data, page: fallbackPage, hasMore: false };
  }

  if (Array.isArray(data?.items)) {
    return {
      items: data.items,
      page: Number(data?.page) || fallbackPage,
      hasMore: Boolean(data?.hasMore),
    };
  }

  return { items: [], page: fallbackPage, hasMore: false };
}

function mergeWithoutDuplicates(current, incoming) {
  const seen = new Set(current.map((item) => item?.id));
  const uniqueIncoming = incoming.filter((item) => !seen.has(item?.id));
  return [...current, ...uniqueIncoming];
}

function EmployeeSkeletonList({ rows = 6 }) {
  return Array.from({ length: rows }).map((_, index) => (
    <Card key={`skeleton-${index}`} className="mb-2 animate-pulse p-4">
      <div className="mb-2 h-4 w-1/3 rounded bg-slate-200" />
      <div className="h-3 w-1/2 rounded bg-slate-200" />
    </Card>
  ));
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef(null);
  const didLoadRef = useRef(false);
  const firstQueryEffectRef = useRef(true);
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(async ({ page: nextPage, q, append }) => {
    const requestId = ++requestIdRef.current;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await api.employees.list({ page: nextPage, pageSize: PAGE_SIZE, q });
      if (requestId !== requestIdRef.current) return;

      const { items, hasMore: nextHasMore, page: responsePage } = normalizePaginatedResponse(
        response,
        nextPage
      );

      setEmployees((prev) => (append ? mergeWithoutDuplicates(prev, items) : items));
      setHasMore(nextHasMore);
      setPage(responsePage);
      setError('');
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Erro:', err);
      setError(
        err?.code === 'REQUEST_TIMEOUT'
          ? 'A requisição demorou demais. Verifique sua conexão e tente novamente.'
          : 'Falha na conexão com o servidor.'
      );
      if (!append) {
        setEmployees([]);
        setHasMore(false);
      }
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    fetchPage({ page: 1, q: '', append: false });
  }, [fetchPage]);

  useEffect(() => {
    if (firstQueryEffectRef.current) {
      firstQueryEffectRef.current = false;
      return;
    }

    const debounceId = window.setTimeout(() => {
      setEmployees([]);
      setPage(1);
      setHasMore(true);
      fetchPage({ page: 1, q: query, append: false });
    }, 300);

    return () => window.clearTimeout(debounceId);
  }, [query, fetchPage]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore || error) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        fetchPage({ page: page + 1, q: query, append: true });
      },
      { root: null, rootMargin: '600px 0px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [error, fetchPage, hasMore, loading, loadingMore, page, query]);

  const hasEmployees = useMemo(() => employees.length > 0, [employees]);

  const retryFirstPage = () => {
    setError('');
    requestIdRef.current += 1;
    setPage(1);
    setHasMore(true);
    fetchPage({ page: 1, q: query, append: false });
  };

  const retryLoadMore = () => {
    setError('');
    fetchPage({ page: page + 1, q: query, append: true });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, CPF, função..."
        />
        <Button onClick={retryFirstPage} disabled={loading || loadingMore}>
          <RefreshCw size={20} className={loading || loadingMore ? 'animate-spin' : ''} />
        </Button>
      </div>

      {error && !hasEmployees && (
        <Card className="flex items-center justify-between gap-2 p-4 text-sm text-red-600">
          <span>{error}</span>
          <Button onClick={retryFirstPage} variant="ghost">
            Tentar novamente
          </Button>
        </Card>
      )}

      {error && hasEmployees && (
        <Card className="flex items-center justify-between gap-2 p-3 text-xs text-amber-700">
          <span>Falha ao carregar mais colaboradores.</span>
          <Button onClick={retryLoadMore} variant="ghost">
            Tentar novamente
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {loading && !hasEmployees ? (
            <EmployeeSkeletonList />
          ) : !loading && employees.length === 0 ? (
            query.trim() ? (
              <Card className="p-4 text-sm text-slate-600">Nenhum colaborador encontrado.</Card>
            ) : (
              <Card className="p-4 text-sm text-slate-600">Em desenvolvimento</Card>
            )
          ) : (
            employees.map((employee) => (
              <Card
                key={employee.id || `${employee.cpf || 'no-cpf'}-${employee.registration || 'no-reg'}`}
                className="mb-2 p-4"
              >
                <div className="font-medium text-slate-900">{employee.name || 'Sem nome'}</div>
                <div className="text-xs text-slate-500">
                  CPF: {employee.cpf || '—'} • Matrícula: {employee.registration || '—'}
                </div>
              </Card>
            ))
          )}
          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
        </div>
      </div>

      {loadingMore && (
        <div className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="sr-only">Carregando mais colaboradores...</span>
          <div className="h-2 w-2 rounded-full bg-slate-500/40 animate-pulse" />
        </div>
      )}
    </div>
  );
}
