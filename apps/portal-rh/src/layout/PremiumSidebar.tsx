import React from 'react';
import { motion } from 'framer-motion';
import {
    Sidebar,
    SidebarBody,
    SidebarLink,
    SidebarSection,
    useSidebar,
    type SidebarLinkItem,
} from '@/components/ui/sidebar';
import {
    ClipboardList,
    FileText,
    Hotel,
    LayoutDashboard,
    Package,
    Plane,
    UserPlus,
    Users,
    Wallet,
    LogOut,
    Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --------------------------------------------------
// Navigation Items Configuration
// --------------------------------------------------

interface NavSection {
    title: string;
    items: {
        key: string;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
    }[];
}

const navSections: NavSection[] = [
    {
        title: 'Principal',
        items: [
            { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ],
    },
    {
        title: 'Operação',
        items: [
            { key: 'mobility', label: 'Embarque / Translado', icon: Plane },
            { key: 'hotel', label: 'Hospedagem', icon: Hotel },
            { key: 'work', label: 'RDOs', icon: ClipboardList },
        ],
    },
    {
        title: 'Cadastros',
        items: [
            { key: 'employees', label: 'Colaboradores', icon: Users },
            { key: 'employeeCreate', label: 'Novo Colaborador', icon: UserPlus },
            { key: 'equipment', label: 'Equipamentos & EPI', icon: Package },
            { key: 'docs', label: 'Documentações', icon: FileText },
        ],
    },
    {
        title: 'Financeiro',
        items: [
            { key: 'finance', label: 'Gestão Financeira', icon: Wallet },
        ],
    },
];

// --------------------------------------------------
// Logo Component
// --------------------------------------------------

const Logo = () => {
    const { open, animate } = useSidebar();

    return (
        <div className="flex items-center gap-3 py-2 px-1.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
                <span className="text-white font-bold text-sm">RH</span>
            </div>
            <motion.div
                animate={{
                    display: animate ? (open ? 'flex' : 'none') : 'flex',
                    opacity: animate ? (open ? 1 : 0) : 1,
                }}
                className="flex flex-col overflow-hidden"
            >
                <span className="text-sm font-bold text-slate-800 whitespace-nowrap">Portal RH</span>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">Logística de Pessoal</span>
            </motion.div>
        </div>
    );
};

// --------------------------------------------------
// User Profile Component
// --------------------------------------------------

const UserProfile = () => {
    const { open, animate } = useSidebar();

    return (
        <div className="mt-auto pt-4 border-t border-slate-100">
            <div className="flex items-center gap-3 py-2 px-1.5">
                <img
                    src="https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=96&q=60"
                    alt="Usuário"
                    className="w-9 h-9 rounded-xl object-cover flex-shrink-0 ring-2 ring-slate-100"
                />
                <motion.div
                    animate={{
                        display: animate ? (open ? 'flex' : 'none') : 'flex',
                        opacity: animate ? (open ? 1 : 0) : 1,
                    }}
                    className="flex flex-col overflow-hidden"
                >
                    <span className="text-sm font-medium text-slate-800 whitespace-nowrap">Ana Silva</span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">Analista RH</span>
                </motion.div>
            </div>

            <motion.div
                animate={{
                    height: animate ? (open ? 'auto' : 0) : 'auto',
                    opacity: animate ? (open ? 1 : 0) : 1,
                }}
                className="overflow-hidden"
            >
                <div className="flex gap-1 mt-2">
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Settings className="w-3.5 h-3.5" />
                        <span>Config</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sair</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --------------------------------------------------
// Tip Component
// --------------------------------------------------

const SidebarTip = () => {
    const { open, animate } = useSidebar();

    return (
        <motion.div
            animate={{
                height: animate ? (open ? 'auto' : 0) : 'auto',
                opacity: animate ? (open ? 1 : 0) : 1,
                marginTop: animate ? (open ? 16 : 0) : 16,
            }}
            className="overflow-hidden"
        >
            <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-100">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    💡 Dica
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                    Este portal é a fonte da verdade. As alterações refletem no app do colaborador.
                </div>
            </div>
        </motion.div>
    );
};

// --------------------------------------------------
// Main PremiumSidebar Component
// --------------------------------------------------

interface PremiumSidebarProps {
    activePage: string;
    onNavigate: (page: string) => void;
}

export default function PremiumSidebar({ activePage, onNavigate }: PremiumSidebarProps) {
    // Build links from sections
    const buildLinks = (section: NavSection): SidebarLinkItem[] => {
        return section.items.map((item) => ({
            label: item.label,
            icon: <item.icon className="w-[18px] h-[18px]" />,
            onClick: () => onNavigate(item.key),
            active: activePage === item.key,
        }));
    };

    return (
        <Sidebar>
            <SidebarBody className="justify-between">
                <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                    {/* Logo */}
                    <Logo />

                    {/* Navigation */}
                    <div className="mt-6 flex flex-col gap-4">
                        {navSections.map((section) => (
                            <div key={section.title} className="flex flex-col gap-1">
                                <SidebarSection title={section.title} className="mb-1" />
                                {buildLinks(section).map((link, idx) => (
                                    <SidebarLink key={idx} link={link} />
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Tip */}
                    <SidebarTip />
                </div>

                {/* User Profile */}
                <UserProfile />
            </SidebarBody>
        </Sidebar>
    );
}
