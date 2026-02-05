import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { ensureDemoSeed, getMode, setMode } from "../services/portalStorage";
import { HoverBorderGradient } from "../ui/HoverBorderGradient.jsx";
import { currentUser } from "../services/currentUser";

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
  const [mode, setModeState] = useState(getMode());

  const openTimer = useRef(null);
  const OPEN_DELAY = 4000;
  const CLOSED_W = "w-[76px]";
  const OPEN_W = "w-72";
  const ICON_COLUMN_W = "72px";
  const ICON_SIZE = 18;

  const ttAnchorRef = useRef(null);
  const [tt, setTt] = useState({ open: false, text: "", x: 0, y: 0 });

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

  useEffect(() => {
    const handleModeSync = () => setModeState(getMode());
    window.addEventListener("portal_rh_xlsx_updated", handleModeSync);
    return () => window.removeEventListener("portal_rh_xlsx_updated", handleModeSync);
  }, []);

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    if (nextMode === "demo") ensureDemoSeed();
    setModeState(nextMode);
  };

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

  const isOpen = open;

  const showTooltip = (el, text) => {
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

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [tt.open]);

  useEffect(() => {
    if (isOpen) hideTooltip();
  }, [isOpen]);

  const user = useMemo(
    () => ({
      name: "Jéssica",
      role: currentUser.role || "RH Operação",
      avatar: currentUser.avatar,
    }),
    []
  );

  return (
    <>
      <TooltipPortal open={tt.open && !isOpen} text={tt.text} x={tt.x} y={tt.y} />

      <aside
        className={cn(
          "h-screen sticky top-0 bg-white border-r border-slate-100 flex flex-col overflow-hidden",
          "transition-[width] duration-200 ease-in-out",
          isOpen ? OPEN_W : CLOSED_W
        )}
        onMouseEnter={scheduleOpen}
        onMouseLeave={closeNow}
        aria-label="Menu lateral"
      >
        <div className="w-full pt-3 pb-2 shrink-0">
          {isOpen ? (
            <div className="grid items-center" style={{ gridTemplateColumns: `${ICON_COLUMN_W} 1fr ${ICON_COLUMN_W}` }}>
              <div className="w-full grid place-items-center">
                <button
                  type="button"
                  onClick={toggleOpen}
                  className="h-9 w-9 rounded-xl bg-blue-600 text-white grid place-items-center text-[11px] font-extrabold tracking-wide shrink-0"
                  aria-label="Portal RH"
                >
                  RH
                </button>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">Portal RH</div>
              </div>
              <div className="w-full grid place-items-center">
                <button
                  type="button"
                  onClick={toggleOpen}
                  className="h-9 w-9 rounded-xl grid place-items-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                  aria-label="Recolher menu lateral"
                >
                  <span aria-hidden="true" className="text-base leading-none">‹</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full grid place-items-center">
              <button
                type="button"
                onClick={toggleOpen}
                className="h-9 w-9 rounded-xl bg-blue-600 text-white grid place-items-center text-[11px] font-extrabold tracking-wide shrink-0"
                aria-label="Portal RH"
              >
                RH
              </button>
            </div>
          )}
        </div>

        <nav
          className={cn(
            "w-full flex-1 min-h-0 overflow-hidden flex flex-col justify-center",
            isOpen ? "items-stretch px-2" : "items-center px-0"
          )}
        >
          {NAV.map((section) => (
            <div key={section.title} className={cn("w-full", isOpen ? "mb-2" : "mb-1 flex flex-col items-center")}>
              {isOpen && (
                <div className="pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide" style={{ paddingLeft: ICON_COLUMN_W }}>
                  {section.title}
                </div>
              )}

              <div className={cn("space-y-1 flex flex-col", isOpen ? "items-stretch" : "items-center w-full")}>
                {section.items.map((it) => {
                  const Icon = it.icon;
                  const isActive = activeKey === it.key;

                  if (!isOpen) {
                    return (
                      <button
                        key={it.key}
                        type="button"
                        onClick={() => handleSelect(it.key)}
                        onMouseEnter={(e) => showTooltip(e.currentTarget, it.label)}
                        onMouseLeave={hideTooltip}
                        onFocus={(e) => showTooltip(e.currentTarget, it.label)}
                        onBlur={hideTooltip}
                        aria-label={it.label}
                        className={cn(
                          "mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-transparent border-0 p-0 m-0 transition",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60",
                          isActive
                            ? "ring-2 ring-blue-400/60 shadow-[0_0_0_6px_rgba(59,130,246,0.14)]"
                            : "hover:ring-2 hover:ring-blue-400/50"
                        )}
                      >
                        <span className="h-12 w-12 grid place-items-center rounded-2xl">
                          <Icon size={ICON_SIZE} className={isActive ? "text-blue-700" : "text-slate-700"} />
                        </span>
                      </button>
                    );
                  }

                  return (
                    <HoverBorderGradient
                      key={it.key}
                      as="button"
                      type="button"
                      active={isActive}
                      duration={1.1}
                      onClick={() => handleSelect(it.key)}
                      onMouseEnter={(e) => showTooltip(e.currentTarget, it.label)}
                      onMouseLeave={hideTooltip}
                      onFocus={(e) => showTooltip(e.currentTarget, it.label)}
                      onBlur={hideTooltip}
                      aria-label={it.label}
                      containerClassName="w-full rounded-2xl"
                      className={cn(
                        "relative z-10 rounded-[inherit] h-12 w-full grid items-center text-sm font-semibold bg-transparent px-2",
                        "grid-cols-[48px_1fr]",
                        isActive ? "text-blue-700" : "text-slate-700"
                      )}
                    >
                      <span className="h-12 w-12 grid place-items-center">
                        <span
                          className={cn(
                            "h-12 w-12 grid place-items-center rounded-2xl",
                            isActive
                              ? "ring-2 ring-blue-400/60 shadow-[0_0_0_6px_rgba(59,130,246,0.14)]"
                              : "hover:ring-2 hover:ring-blue-400/50"
                          )}
                        >
                          <Icon size={ICON_SIZE} className={isActive ? "text-blue-700" : "text-slate-700"} />
                        </span>
                      </span>
                      <span className="whitespace-nowrap block text-left">{it.label}</span>
                    </HoverBorderGradient>
                  );
                })}
              </div>
            </div>
          ))}

          {isOpen && (
            <div className="mt-3 mx-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hidden lg:block">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Dica
              </div>
              <div className="mt-1.5 text-xs text-slate-600">
                Este portal é a fonte da verdade. As alterações refletem no app do colaborador.
              </div>
            </div>
          )}
        </nav>

        <div className="p-3 shrink-0 overflow-hidden">
          <button
            type="button"
            aria-label={`${user.name} • ${user.role}`}
            className={cn(
              "relative w-full rounded-2xl border border-slate-100 bg-white shadow-sm",
              "flex items-center p-2.5",
              isOpen ? "gap-3 justify-start" : "gap-0 justify-center"
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
                className="h-11 w-11 rounded-full object-cover border border-slate-100"
              />
            ) : (
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-100 via-indigo-100 to-sky-100 border border-blue-200/70 grid place-items-center text-sm font-bold text-blue-700">
                JM
              </div>
            )}

            {isOpen && (
              <div className="min-w-0 text-left">
                <div className="text-sm font-semibold text-slate-900 truncate">{user.name}</div>
                <div className="text-xs text-slate-500 truncate">{user.role}</div>
              </div>
            )}
          </button>

          {isOpen ? (
            <div className="mt-2 rounded-2xl border border-slate-100 bg-white p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">Modo</span>
                {mode === "demo" && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">DEMO</span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => handleModeChange("demo")}
                  className={cn(
                    "rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors",
                    mode === "demo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  DEMO
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("prod")}
                  className={cn(
                    "rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors",
                    mode === "prod" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  PROD
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleModeChange(mode === "demo" ? "prod" : "demo")}
              className={cn(
                "mt-2 w-full rounded-2xl border border-slate-100 bg-white px-2 py-2 text-[10px] font-semibold",
                mode === "demo" ? "text-amber-700" : "text-slate-600"
              )}
              aria-label={`Alternar modo atual: ${mode}`}
            >
              {mode === "demo" ? "DEMO" : "PROD"}
            </button>
          )}

          <div className="mt-2 text-center text-[10px] font-medium text-slate-400">desenvolvido por Hubye</div>
        </div>
      </aside>
    </>
  );
}
