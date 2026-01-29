import React, { useState, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// --------------------------------------------------
// Types
// --------------------------------------------------

export interface SidebarLinkItem {
    label: string;
    href?: string;
    icon: React.ReactNode;
    onClick?: () => void;
    active?: boolean;
}

interface SidebarContextProps {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    animate: boolean;
}

// --------------------------------------------------
// Context
// --------------------------------------------------

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
};

// --------------------------------------------------
// Provider
// --------------------------------------------------

export const SidebarProvider = ({
    children,
    open: openProp,
    setOpen: setOpenProp,
    animate = true,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    const [openState, setOpenState] = useState(false);
    const open = openProp !== undefined ? openProp : openState;
    const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

    return (
        <SidebarContext.Provider value={{ open, setOpen, animate }}>
            {children}
        </SidebarContext.Provider>
    );
};

// --------------------------------------------------
// Sidebar Wrapper
// --------------------------------------------------

export const Sidebar = ({
    children,
    open,
    setOpen,
    animate,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
        {children}
    </SidebarProvider>
);

// --------------------------------------------------
// SidebarBody (renders both Desktop and Mobile)
// --------------------------------------------------

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => (
    <>
        <DesktopSidebar {...props} />
        <MobileSidebar {...(props as React.ComponentProps<'div'>)} />
    </>
);

// --------------------------------------------------
// Desktop Sidebar (hover expand/collapse)
// --------------------------------------------------

export const DesktopSidebar = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof motion.div>) => {
    const { open, setOpen, animate } = useSidebar();

    return (
        <motion.div
            className={cn(
                'h-screen px-4 py-4 hidden md:flex md:flex-col bg-white border-r border-slate-100 flex-shrink-0 sticky top-0',
                className
            )}
            animate={{
                width: animate ? (open ? '280px' : '72px') : '280px',
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            {...props}
        >
            {children}
        </motion.div>
    );
};

// --------------------------------------------------
// Mobile Sidebar (slide in/out drawer)
// --------------------------------------------------

export const MobileSidebar = ({
    className,
    children,
    ...props
}: React.ComponentProps<'div'>) => {
    const { open, setOpen } = useSidebar();

    return (
        <>
            {/* Mobile Header Bar */}
            <div
                className={cn(
                    'h-14 px-4 py-3 flex flex-row md:hidden items-center justify-between bg-white border-b border-slate-100 w-full sticky top-0 z-40',
                    className
                )}
                {...props}
            >
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">RH</span>
                    </div>
                    <span className="font-semibold text-slate-800">Portal RH</span>
                </div>
                <button
                    onClick={() => setOpen(!open)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <Menu className="w-5 h-5 text-slate-700" />
                </button>
            </div>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 bg-black z-[90] md:hidden"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="fixed h-full w-72 inset-y-0 left-0 bg-white p-4 z-[100] flex flex-col md:hidden shadow-xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold text-sm">RH</span>
                                    </div>
                                    <span className="font-semibold text-slate-800">Portal RH</span>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-700" />
                                </button>
                            </div>
                            {children}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

// --------------------------------------------------
// SidebarLink
// --------------------------------------------------

export const SidebarLink = ({
    link,
    className,
}: {
    link: SidebarLinkItem;
    className?: string;
}) => {
    const { open, animate } = useSidebar();

    const iconElement = (
        <div
            className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                link.active
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600 group-hover/link:bg-slate-200'
            )}
        >
            {link.icon}
        </div>
    );

    const labelElement = (
        <motion.span
            animate={{
                display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
                opacity: animate ? (open ? 1 : 0) : 1,
            }}
            transition={{ duration: 0.2 }}
            className={cn(
                'text-sm font-medium whitespace-nowrap overflow-hidden',
                link.active ? 'text-blue-700' : 'text-slate-700'
            )}
        >
            {link.label}
        </motion.span>
    );

    const commonClass = cn(
        'flex items-center gap-3 py-1.5 px-1.5 rounded-xl transition-all duration-200 group/link w-full',
        link.active
            ? 'bg-blue-50 shadow-sm'
            : 'hover:bg-slate-50',
        className
    );

    if (link.onClick) {
        return (
            <button type="button" onClick={link.onClick} className={commonClass}>
                {iconElement}
                {labelElement}
            </button>
        );
    }

    return (
        <a href={link.href || '#'} className={commonClass}>
            {iconElement}
            {labelElement}
        </a>
    );
};

// --------------------------------------------------
// Section Header (for grouping links)
// --------------------------------------------------

export const SidebarSection = ({
    title,
    className,
}: {
    title: string;
    className?: string;
}) => {
    const { open, animate } = useSidebar();

    return (
        <motion.div
            animate={{
                opacity: animate ? (open ? 1 : 0) : 1,
                height: animate ? (open ? 'auto' : 0) : 'auto',
            }}
            className={cn('overflow-hidden', className)}
        >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2">
                {title}
            </span>
        </motion.div>
    );
};
