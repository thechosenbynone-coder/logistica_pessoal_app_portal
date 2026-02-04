import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../ui/ui.js";
import {
  ClipboardList,
  FileText,
  HardHat,
  LayoutDashboard,
  Lightbulb,
  Plane,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

const NAV = [
  {
    title: "Principal",
    items: [{ key: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Operação",
    items: [
      { key: "mobility", label: "Escala e Embarque", icon: Plane },
      { key: "equipment", label: "EPIs", icon: HardHat },
      { key: "work", label: "OS / RDO", icon: ClipboardList },
    ],
  },
  {
    title: "RH",
    items: [
      { key: "employees", label: "Colaboradores", icon: Users },
      { key: "docs", label: "Documentações", icon: FileText },
    ],
  },
  {
    title: "Financeiro",
    items: [{ key: "finance", label: "Gestão Financeira", icon: Wallet }],
  },
];

function TooltipPortal({ open, text, x, y }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: x,
        top: y,
        transform: "translateY(-50%)",
        zIndex: 99999,
        pointerEvents: "none",
      }}
      className="opacity-100 transition-opacity duration-100"
      aria-hidden="true"
    >
      <div className="relative rounded-xl bg-slate-900/95 text-white text-xs font-semibold px-3 py-2 shadow-xl whitespace-nowrap border border-white/10 backdrop-blur-sm">
        {text}
        <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[6px] border-r-slate-900/95" />
      </div>
    </div>,
    document.body
  );
}

export default function Sidebar({ active, onSelect, onNavigate }) {
  const [open, setOpen] = useState(false);

  // Hover com intenção (4s)
  const openTimer = useRef(null);
  const OPEN_DELAY = 4000;

  const ICON_SIZE = 18;

  // Barra glow deslizante
  const barWrapRef = useRef(null);
  const itemRefs = useRef({});
  const BAR_H = 34;
  const [barY, setBarY] = useState(0);
  const [barVisible, setBarVisible] = useState(false);

  // Tooltip (portal): não é cortado por overflow do sidebar e não cria scroll
  const ttAnchorRef = useRef(null);
  const [tt, setTt] = useState({ open: false, text: "", x: 0, y: 0 });

  // ✅ Se cair numa rota antiga que agora “mora” dentro de um módulo, marca o módulo pai
  const activeKey = useMemo(() => {
    if (active === "hotel") return "mobility";
    if (active === "employeeCreate") return "employees";
    return active;
  }, [active]);

  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
    };
  }, []);

  const scheduleOpen = () => {
    if (open) return;
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setOpen(true), OPEN_DELAY);
  };

  const hideTooltip = () => {
    ttAnchorRef.current = null;
    setTt((v) => (v.open ? { ...v, open: false } : v));
  };

  const closeNow = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = null;
    setOpen(false);
    hideTooltip();
  };

  const toggleOpen = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    setOpen((v) => !v);
  };

  const handleSelect = (key) => {
    const fn = onNavigate || onSelect;
    if (typeof fn === "function") fn(key);
  };

  const user = useMemo(
    () => ({
      name: "Ana Silva",
      role: "Analista RH",
      avatar:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=96&q=60",
    }),
    []
  );

  const isOpen = open;

  const showTooltip = (el, text) => {
    // Tooltip só quando fechado
    if (!el || isOpen) return;
    ttAnchorRef.current = el;
    const r = el.getBoundingClientRect();
    setTt({
      open: true,
      text,
      x: Math.round(r.right + 12),
      y: Math.round(r.top + r.height / 2),
    });
  };

  // Mantém a posição correta do tooltip se a página rolar / redimensionar
  useEffect(() => {
    if (!tt.open) return;

    const update = () => {
      const el = ttAnchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setTt((v) => ({
        ...v,
        x: Math.round(r.right + 12),
        y: Math.round(r.top + r.height / 2),
      }));
    };

    const onScroll = () => update();
    const onResize = () => update();

    // capture=true pra pegar scroll em containers também
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [tt.open]);

  // Quando abrir, some com tooltips imediatamente
  useEffect(() => {
    if (isOpen) hideTooltip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const computeBar = () => {
    const wrap = barWrapRef.current;
    const el = itemRefs.current?.[activeKey];
    if (!wrap || !el) {
      setBarVisible(false);
      return;
    }
    const wrapRect = wrap.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const centerY = elRect.top - wrapRect.top + elRect.height / 2;
    const topY = centerY - BAR_H / 2;
    setBarY(Math.max(0, topY));
    setBarVisible(true);
  };

  useLayoutEffect(() => {
    computeBar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, isOpen]);

  useEffect(() => {
    const onResize = () => computeBar();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, isOpen]);

  return (
    <>
      <TooltipPortal open={tt.open && !isOpen} text={tt.text} x={tt.x} y={tt.y} />

      <aside
        className={cn(
          // ✅ Sidebar fixo visualmente, sem scroll interno e sem “vazar” tooltip
          "h-screen sticky top-0 bg-white border-r border-slate-100 flex flex-col overflow-hidden",
          "transition-[width] duration-200 ease-in-out",
          isOpen ? "w-72" : "w-[76px]"
        )}
        onMouseEnter={scheduleOpen}
        onMouseLeave={closeNow}
        aria-label="Menu lateral"
      >
        {/* Header */}
        <div className="p-4 shrink-0">
          <button
            type="button"
            onClick={toggleOpen}
            className={cn(
              "w-full rounded-2xl border border-slate-100 bg-white shadow-sm",
              "flex items-center p-3",
              isOpen ? "gap-3 justify-start" : "gap-0 justify-center"
            )}
            aria-label="Portal RH"
            onMouseEnter={(e) => showTooltip(e.currentTarget, "Portal RH")}
            onMouseLeave={hideTooltip}
            onFocus={(e) => showTooltip(e.currentTarget, "Portal RH")}
            onBlur={hideTooltip}
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 grid place-items-center shrink-0 overflow-hidden">
              <div className="h-5 w-5 rounded-md bg-white/95" />
            </div>

            {isOpen && (
              <div className="min-w-0 text-left">
                <div className="text-sm font-semibold text-slate-900">Portal RH</div>
                <div className="text-xs text-slate-500">Logística de Pessoal</div>
              </div>
            )}
          </button>
        </div>

        {/* Nav (SEM rolagem) */}
        <nav className="px-3 pb-3 flex-1 min-h-0 overflow-hidden">
          <div ref={barWrapRef} className="relative">
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-0 w-1 rounded-r-full",
                "bg-gradient-to-b from-blue-500 to-blue-700",
                "shadow-[0_0_18px_rgba(37,99,235,0.45)]",
                "transition-[transform,opacity] duration-300 ease-out"
              )}
              style={{
                height: BAR_H,
                transform: `translateY(${barY}px)`,
                opacity: barVisible ? 1 : 0,
              }}
            />

            {NAV.map((section) => (
              <div key={section.title} className="mb-3">
                {isOpen && (
                  <div className="px-2 pt-2 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {section.title}
                  </div>
                )}

                <div className="space-y-1">
                  {section.items.map((it) => {
                    const Icon = it.icon;
                    const isActive = activeKey === it.key;

                    return (
                      <button
                        key={it.key}
                        ref={(el) => {
                          if (el) itemRefs.current[it.key] = el;
                        }}
                        type="button"
                        onClick={() => handleSelect(it.key)}
                        aria-label={it.label}
                        className={cn(
                          "relative w-full",
                          "flex items-center px-2 py-2 transition-colors",
                          isOpen ? "gap-3 justify-start rounded-2xl" : "gap-0 justify-center rounded-2xl",
                          isActive ? (isOpen ? "bg-blue-50/70" : "bg-transparent") : "hover:bg-slate-50",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200/70 focus-visible:ring-offset-0"
                        )}
                        onMouseEnter={(e) => showTooltip(e.currentTarget, it.label)}
                        onMouseLeave={hideTooltip}
                        onFocus={(e) => showTooltip(e.currentTarget, it.label)}
                        onBlur={hideTooltip}
                      >
                        <div
                          className={cn(
                            "h-11 w-11 min-w-[44px] rounded-2xl shrink-0",
                            "grid place-items-center overflow-hidden relative leading-none",
                            isActive
                              ? "bg-blue-50 ring-1 ring-blue-200 shadow-[0_0_16px_rgba(37,99,235,0.18)]"
                              : "bg-slate-100"
                          )}
                        >
                          <Icon
                            size={ICON_SIZE}
                            className={cn(
                              "block !max-w-none !max-h-none",
                              isActive ? "text-blue-700" : "text-slate-700"
                            )}
                          />
                        </div>

                        {isOpen && (
                          <span
                            className={cn(
                              "text-sm font-semibold whitespace-nowrap",
                              isActive ? "text-blue-700" : "text-slate-700"
                            )}
                          >
                            {it.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Dica só aparece em telas grandes para não “apertar” o footer e gerar overflow */}
          {isOpen && (
            <div className="mt-4 mx-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hidden lg:block">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Dica
              </div>
              <div className="mt-2 text-xs text-slate-600">
                Este portal é a fonte da verdade. As alterações refletem no app do colaborador.
              </div>
            </div>
          )}
        </nav>

        {/* Footer profile (sempre visível) */}
        <div className="p-3 shrink-0 overflow-hidden">
          <button
            type="button"
            aria-label={`${user.name} • ${user.role}`}
            className={cn(
              "relative w-full rounded-2xl border border-slate-100 bg-white shadow-sm",
              "flex items-center p-3",
              isOpen ? "gap-3 justify-start" : "gap-0 justify-center",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200/70 focus-visible:ring-offset-0"
            )}
            onMouseEnter={(e) => showTooltip(e.currentTarget, `${user.name} • ${user.role}`)}
            onMouseLeave={hideTooltip}
            onFocus={(e) => showTooltip(e.currentTarget, `${user.name} • ${user.role}`)}
            onBlur={hideTooltip}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-11 w-11 rounded-2xl object-cover border border-slate-100"
              />
            ) : (
              <div className="h-11 w-11 rounded-2xl bg-slate-100 grid place-items-center">
                <UserRound size={ICON_SIZE} className="text-slate-600" />
              </div>
            )}

            {isOpen && (
              <div className="min-w-0 text-left">
                <div className="text-sm font-semibold text-slate-900 truncate">{user.name}</div>
                <div className="text-xs text-slate-500 truncate">{user.role}</div>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
