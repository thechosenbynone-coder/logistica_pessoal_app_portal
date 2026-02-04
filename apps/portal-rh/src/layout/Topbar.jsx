import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Search, UserRound } from 'lucide-react'
import Input from '../ui/Input.jsx'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'
import Badge from '../ui/Badge.jsx'
import {
  clearDemoData,
  getDemoScenario,
  isDemoMode,
  seedDemoDataIfNeeded,
  setDemoMode,
  setDemoScenario
} from '../services/demoMode'
import { cn } from '../ui/ui.js'

export default function Topbar({
  search,
  onSearch,
  onOpenProfile,
  onSearchSelect,
  employees = []
}) {
  const [quickOpen, setQuickOpen] = useState(false)
  const [demoScenario, setDemoScenarioState] = useState(getDemoScenario())
  const demoMode = isDemoMode()

  // Busca do modal (Ctrl/Cmd + K)
  const [q, setQ] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  // Busca da barra (modo controlado OU interno)
  const [searchLocal, setSearchLocal] = useState('')
  const searchValue = typeof search === 'string' ? search : searchLocal

  const setSearchValue = useCallback(
    (val) => {
      if (typeof onSearch === 'function') return onSearch(val)
      setSearchLocal(val)
    },
    [onSearch]
  )

  const openProfile = useCallback(
    (id, tab = 'overview') => {
      if (!id) return
      if (typeof onOpenProfile === 'function') return onOpenProfile(id, tab)
      if (typeof onSearchSelect === 'function') return onSearchSelect(id)
    },
    [onOpenProfile, onSearchSelect]
  )

  const filterEmployees = useCallback(
    (query) => {
      const qq = (query || '').toLowerCase().trim()
      if (!qq) return employees.slice(0, 8)
      return employees
        .filter((e) => {
          return [e.name, e.registration, e.cpf, e.hub, e.client, e.role]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(qq))
        })
        .slice(0, 8)
    },
    [employees]
  )

  const results = useMemo(() => filterEmployees(q), [filterEmployees, q])
  const barResults = useMemo(() => filterEmployees(searchValue), [filterEmployees, searchValue])

  useEffect(() => {
    if (!quickOpen) return
    setActiveIndex(0)
    // foco após render do modal
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [quickOpen])

  useEffect(() => {
    setActiveIndex(0)
  }, [q])

  useEffect(() => {
    setDemoScenarioState(getDemoScenario())
  }, [demoMode])

  useEffect(() => {
    const onKeyDown = (e) => {
      const cmdOrCtrl = e.ctrlKey || e.metaKey

      // Atalho: Ctrl+K / Cmd+K
      if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setQuickOpen(true)
        return
      }

      if (!quickOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        setQuickOpen(false)
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        const picked = results[activeIndex] || results[0]
        if (picked?.id) {
          openProfile(picked.id, 'overview')
          setQuickOpen(false)
          setQ('')
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, openProfile, quickOpen, results])

  const closeQuick = () => {
    setQuickOpen(false)
    setQ('')
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const picked = barResults[0]
                if (picked?.id) openProfile(picked.id, 'overview')
              }
            }}
            placeholder="Buscar colaborador, matrícula, CPF, hub, cliente..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {demoMode && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
            <Badge tone="amber">DEMO</Badge>
            {['saudavel', 'risco', 'critico'].map((scenario) => (
              <Button
                key={scenario}
                type="button"
                variant={demoScenario === scenario ? 'primary' : 'secondary'}
                className="text-xs"
                onClick={() => {
                  setDemoScenario(scenario)
                  setDemoScenarioState(scenario)
                  seedDemoDataIfNeeded(scenario, true)
                }}
              >
                {scenario === 'saudavel' ? 'Saudável' : scenario === 'risco' ? 'Em risco' : 'Crítico'}
              </Button>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => {
                clearDemoData()
                seedDemoDataIfNeeded(demoScenario, true)
              }}
            >
              Recarregar
            </Button>
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          className="text-sm"
          onClick={() => {
            if (demoMode) {
              setDemoMode(false)
              window.location.assign('/')
            } else {
              setDemoMode(true)
              window.location.assign('/demo')
            }
          }}
        >
          Modo: {demoMode ? 'Demo' : 'Produção'}
        </Button>
        <Button
          variant="secondary"
          className="text-sm"
          onClick={() => setQuickOpen(true)}
          title="Abrir perfil (Ctrl/Cmd+K)"
          type="button"
        >
          <Search size={16} />
          <span className="hidden sm:inline">Abrir perfil</span>
        </Button>

        <button className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50" type="button">
          <Bell size={18} />
        </button>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <UserRound size={18} className="text-gray-600" />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-semibold text-gray-800">RH Operação</div>
            <div className="text-[11px] text-gray-500">admin@empresa.com</div>
          </div>
        </div>
      </div>

      <Modal open={quickOpen} onClose={closeQuick} title="Abrir perfil" className="max-w-2xl">
        <div className="space-y-3">
          <div className="text-xs text-gray-500">
            Dica: use <span className="font-semibold">Ctrl+K</span> para abrir rápido,{' '}
            <span className="font-semibold">↑/↓</span> para navegar e{' '}
            <span className="font-semibold">Enter</span> para abrir.
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <Input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Digite o nome, matrícula, CPF, hub ou cliente…"
              className="pl-9"
            />
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            {results.map((e, idx) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  openProfile(e.id, 'overview')
                  closeQuick()
                }}
                className={cn(
                  'w-full text-left p-3 flex items-start justify-between gap-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50',
                  idx === activeIndex && 'bg-blue-50'
                )}
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900">{e.name}</div>
                  <div className="text-xs text-gray-500">
                    {e.registration} • {e.role} • {e.hub} • {e.client}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={e.status === 'ATIVO' ? 'green' : 'gray'}>{e.status}</Badge>
                    <Badge tone={e.docs?.expired > 0 ? 'red' : e.docs?.warning > 0 ? 'yellow' : 'green'}>
                      Docs: {e.docs?.expired || 0} exp • {e.docs?.warning || 0} aviso
                    </Badge>
                  </div>
                </div>
                <div className="text-xs font-semibold text-blue-700 mt-1">Abrir</div>
              </button>
            ))}

            {results.length === 0 && (
              <div className="p-4 text-sm text-gray-600">Nada encontrado. Tente outro termo.</div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
