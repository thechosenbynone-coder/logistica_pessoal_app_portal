import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../ui/ui.js";
import {
  ClipboardList,
  FileText,
  HardHat,
  LayoutDashboard,
  Plane,
  Users,
  Wallet,
} from "lucide-react";
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
  const SIDEBAR_W = "w-[76px]";
  const ICON_SIZE = 18;

  const ttAnchorRef = useRef(null);
  const [tt, setTt] = useState({ open: false, text: "", x: 0, y: 0 });

  const activeKey = useMemo(() => {
    if (active === "hotel") return "mobility";
    if (active === "employeeCreate") return "employees";
    return active;
  }, [active]);

  const hideTooltip = () => {
    ttAnchorRef.current = null;
    setTt((v) => (v.open ? { ...v, open: false } : v));
  };

  const handleSelect = (key) => {
    const fn = onNavigate || onSelect;
    if (typeof fn === "function") fn(key);
  };

  const showTooltip = (el, text) => {
    if (!el) return;
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

  const user = useMemo(
    () => ({
      name: "Jéssica",
      role: currentUser.role || "RH Operação",
      avatar: currentUser.avatar,
    }),
    []
  );

  const navItems = useMemo(() => NAV.flatMap((section) => section.items), []);

  return (
    <>
      <TooltipPortal open={tt.open} text={tt.text} x={tt.x} y={tt.y} />

      <aside
        className={cn(
          "h-screen sticky top-0 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800 flex flex-col overflow-hidden",
          SIDEBAR_W
        )}
        aria-label="Menu lateral"
      >
        <div className="w-full pt-3 pb-2 shrink-0">
          <div className="w-full grid place-items-center">
            <div className="h-9 w-9 rounded-xl bg-slate-900 border border-blue-500/60 text-blue-400 grid place-items-center text-[11px] font-extrabold tracking-wide shrink-0">
              RH
            </div>
          </div>
        </div>

        <nav className="w-full flex-1 min-h-0 flex flex-col justify-center items-center">
          <div className="flex flex-col items-center gap-3">
            {navItems.map((it) => {
              const Icon = it.icon;
              const isActive = activeKey === it.key;

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
                    "grid h-11 w-11 place-items-center rounded-xl bg-transparent border-0 p-0 m-0 transition",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
                    isActive
                      ? "ring-2 ring-blue-500/70 bg-slate-900/70 shadow-[0_0_0_5px_rgba(59,130,246,0.12)]"
                      : "hover:ring-2 hover:ring-blue-500/45 hover:bg-slate-900/60"
                  )}
                >
                  <Icon size={ICON_SIZE} className={isActive ? "text-blue-500" : "text-slate-400"} />
                </button>
              );
            })}
          </div>
        </nav>

        <div className="p-3 shrink-0 overflow-hidden">
          <button
            type="button"
            aria-label={`${user.name} • ${user.role}`}
            className={cn(
              "relative w-full rounded-2xl border border-slate-700/60 bg-slate-900/50 shadow-sm",
              "flex items-center p-2.5",
              "gap-0 justify-center"
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
                className="h-11 w-11 rounded-full object-cover border border-slate-700/60"
              />
            ) : (
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-100 via-indigo-100 to-sky-100 border border-blue-200/70 grid place-items-center text-sm font-bold text-blue-500">
                JM
              </div>
            )}
          </button>

          <div className="mt-2 text-center text-[11px] font-semibold text-slate-400">Jéssica</div>

          <div className="mt-2 text-center text-[10px] font-medium text-slate-500">desenvolvido por Hubye</div>
        </div>
      </aside>
    </>
  );
}
