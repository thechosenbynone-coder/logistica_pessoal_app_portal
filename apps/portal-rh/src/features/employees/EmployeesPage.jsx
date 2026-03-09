import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
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
    <div key={`skeleton-${index}`} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '6px', padding: '12px 14px', marginBottom: 4,
      animation: 'pulse 1.5s infinite',
    }}>
      <div style={{ height: 12, width: '33%', background: 'var(--surface2)', borderRadius: 3, marginBottom: 6 }} />
      <div style={{ height: 10, width: '50%', background: 'var(--surface2)', borderRadius: 3 }} />
    </div>
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

  const refetch = retryFirstPage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--text)' }}>
            Colaboradores
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.06em', marginTop: 2 }}>
            {employees.length} registros carregados
          </div>
        </div>
        <button
          onClick={() => { /* onNavigate para criar novo — manter comportamento existente */ }}
          style={{
            background: 'var(--amber)', color: '#000', border: 'none',
            borderRadius: '6px', padding: '7px 14px', cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
            fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          + Novo colaborador
        </button>
      </div>

      {/* Busca */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nome, função ou CPF..."
            style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '8px 12px', fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px', color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--amber)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <button
          onClick={() => { if (typeof refetch === 'function') refetch(); }}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px',
            padding: '8px 12px', cursor: 'pointer', color: 'var(--muted)',
            display: 'flex', alignItems: 'center',
          }}
          title="Recarregar"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          background: 'var(--red-bg)', border: '1px solid var(--red-dim)',
          borderRadius: '6px', padding: '10px 14px',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--red)',
        }}>
          {error}
        </div>
      )}

      {/* Lista */}
      <div>
        {loading ? (
          <EmployeeSkeletonList />
        ) : employees.length === 0 ? (
          <div style={{
            padding: '40px 0', textAlign: 'center',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
            color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Nenhum colaborador encontrado
          </div>
        ) : (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nome', 'Função', 'Status', 'Docs', ''].map(h => (
                    <th key={h} style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                      textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)',
                      padding: '8px 12px', textAlign: 'left',
                      background: 'var(--bg)', borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr
                    key={emp.id}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'var(--surface2)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'Syne', sans-serif", fontSize: '10px', fontWeight: 800, color: 'var(--text2)',
                          flexShrink: 0,
                        }}>
                          {(emp.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>{emp.name || `#${emp.id}`}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text2)' }}>
                      {emp.role || emp.cargo || '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-flex', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                        borderRadius: '3px', padding: '2px 6px', letterSpacing: '0.04em', fontWeight: 500,
                        ...(emp.active === false
                          ? { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }
                          : { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.2)' }),
                      }}>
                        {emp.active === false ? 'Inativo' : 'Ativo'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ width: 60, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: '80%', background: 'var(--green)', borderRadius: 2 }} />
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', fontWeight: 500,
                          borderRadius: '3px', padding: '3px 7px', cursor: 'pointer',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
                          transition: 'color 0.15s',
                        }}
                      >
                        Ver perfil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Sentinel de scroll infinito — manter ref existente */}
            <div ref={sentinelRef} style={{ height: 1 }} />
            {loadingMore && (
              <div style={{ padding: '12px', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)' }}>
                Carregando...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
