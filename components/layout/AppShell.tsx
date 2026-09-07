"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Building2,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    FolderKanban,
    Handshake,
    LayoutDashboard,
    ListChecks,
    LogOut,
    Menu,
    Network,
    ShieldCheck,
    ListTree,
    Tags,
    UsersRound,
    Workflow,
    X
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { hasRole, isAdministrator, isProjectManager, isWorker, REPORT_ROLES } from "@/lib/roles";
import { NotificationBell } from "@/components/layout/NotificationBell";

interface AppShellProps {
    children: ReactNode;
}

const navigation: Array<{
    name: string;
    href: string;
    icon: typeof LayoutDashboard;
    visible: (roleName: string | undefined) => boolean;
}> = [
    {
        name: "Reportes",
        href: "/reports",
        icon: BarChart3,
        visible: (roleName) => hasRole(roleName, REPORT_ROLES)
    },
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        visible: isProjectManager
    },
    {
        name: "Roles",
        href: "/roles",
        icon: ShieldCheck,
        visible: isAdministrator
    },
    {
        name: "Departamentos",
        href: "/departments",
        icon: Building2,
        visible: isAdministrator
    },
    {
        name: "Empresas cliente",
        href: "/client-companies",
        icon: Handshake,
        visible: isAdministrator
    },
    {
        name: "Tipos de proyecto",
        href: "/project-types",
        icon: Tags,
        visible: isAdministrator
    },
    {
        name: "Usuarios",
        href: "/users",
        icon: UsersRound,
        visible: isAdministrator
    },
    {
        name: "Asignaciones",
        href: "/department-users",
        icon: Network,
        visible: isAdministrator
    },
    {
        name: "Accesos de directores",
        href: "/director-accesses",
        icon: ShieldCheck,
        visible: isAdministrator
    },
    {
        name: "Proyectos",
        href: "/projects",
        icon: FolderKanban,
        visible: isProjectManager
    },
    {
        name: "Mi equipo",
        href: "/my-team",
        icon: UsersRound,
        visible: (roleName) => roleName === "Director"
    },
    {
        name: "Mis tareas",
        href: "/my-work/tasks",
        icon: ListChecks,
        visible: isWorker
    },
    {
        name: "Mis subtareas",
        href: "/my-work/subtasks",
        icon: ListTree,
        visible: isWorker
    },
    {
        name: "Próximos vencimientos",
        href: "/my-work/tasks?view=due",
        icon: CalendarDays,
        visible: isWorker
    },
    {
        name: "Completadas",
        href: "/my-work/tasks?view=completed",
        icon: CheckCircle2,
        visible: isWorker
    },
    {
        name: "Subproyectos",
        href: "/subprojects",
        icon: Workflow,
        visible: isProjectManager
    },
    {
        name: "Tareas",
        href: "/tasks",
        icon: ListChecks,
        visible: isProjectManager
    },
    {
        name: "Subtareas",
        href: "/subtasks",
        icon: ListTree,
        visible: isProjectManager
    }
];

export function AppShell({
                             children
                         }: AppShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const isReportsPage = pathname.startsWith("/reports");

    function handleLogout() {
        logout();
        router.replace("/");
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {isMobileOpen && (
                <button
                    type="button"
                    aria-label="Cerrar menú"
                    onClick={() => setIsMobileOpen(false)}
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-700 bg-[#172938] text-white transition-transform lg:translate-x-0 ${
                    isMobileOpen
                        ? "translate-x-0"
                        : "-translate-x-full"
                }`}
            >
                <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3"
                        onClick={() => setIsMobileOpen(false)}
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 text-sm font-bold text-white">
                            A
                        </span>

                        <span className="text-xl font-semibold text-white">
                            AgencyFlow
                        </span>
                    </Link>

                    <button
                        type="button"
                        title="Cerrar menú"
                        aria-label="Cerrar menú"
                        onClick={() => setIsMobileOpen(false)}
                        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-5">
                            <p className="mb-2 px-3 text-xs font-semibold uppercase text-gray-400">
                        {isWorker(user?.roleName) ? "Trabajo" : "General"}
                    </p>

                    <ul>
                        {navigation.filter((item) => item.visible(user?.roleName)).map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href.split("?")[0] &&
                                (item.href === "/my-work" ? !window.location.search : window.location.search === item.href.slice(item.href.indexOf("?")));

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={() =>
                                            setIsMobileOpen(false)
                                        }
                                        className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                                            isActive
                                                ? "bg-blue-500/30 text-white ring-1 ring-blue-400/20"
                                                : "text-slate-200 hover:bg-white/10 hover:text-white"
                                        }`}
                                    >
                                        <Icon size={19} />
                                        {item.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="border-t border-white/10 p-4">
                    <div className="mb-4 min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                            {user?.firstName} {user?.lastName}
                        </p>

                        <p className="truncate text-xs text-slate-300">
                            {user?.roleName}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                        <LogOut size={18} />
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            <div className="lg:pl-64">
                <header className={`z-20 flex h-16 items-center px-4 sm:px-6 ${isReportsPage ? "absolute right-0 top-0 bg-transparent" : "sticky top-0 border-b border-gray-200 bg-white"}`}>
                    <button
                        type="button"
                        title="Abrir menú"
                        aria-label="Abrir menú"
                        onClick={() => setIsMobileOpen(true)}
                        className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
                    >
                        <Menu size={22} />
                    </button>

                    <div className="ml-auto flex items-center gap-3">
                        <NotificationBell isWorker={isWorker(user?.roleName)} />
                        <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                            {user?.firstName} {user?.lastName}
                        </p>

                        <p className="text-xs text-gray-500">
                            {user?.roleName}
                        </p>
                        </div>
                    </div>
                </header>

                <main className={isReportsPage ? "w-full px-6 pb-5 pt-6" : "mx-auto max-w-7xl p-4 sm:p-6"}>
                    {isWorker(user?.roleName) && pathname.startsWith("/my-work") && (
                        <nav aria-label="Mi trabajo" className="mb-5 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                            <Link href="/my-work/tasks" className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold ${pathname.endsWith("/subtasks") ? "text-gray-600 hover:bg-white" : "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100"}`}>
                                <CheckCircle2 size={16} />Mis tareas
                            </Link>
                            <Link href="/my-work/subtasks" className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold ${pathname.endsWith("/subtasks") ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100" : "text-gray-600 hover:bg-white"}`}>
                                <ListTree size={16} />Mis subtareas
                            </Link>
                        </nav>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
