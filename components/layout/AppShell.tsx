"use client";

import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Building2,
    BarChart3,
    BriefcaseBusiness,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
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
import { hasPermission, hasRole, isAdministrator, isProjectManager, isWorker, REPORT_ROLES } from "@/lib/roles";
import { NotificationBell } from "@/components/layout/NotificationBell";

interface AppShellProps {
    children: ReactNode;
}

const navigation: Array<{
    name: string;
    href: string;
    icon: typeof LayoutDashboard;
    visible: (roleName: string | undefined) => boolean;
    permission?: string;
    requiredPermissions?: string[];
}> = [
    {
        name: "Permisos",
        href: "/permissions",
        icon: ShieldCheck,
        visible: (roleName) => roleName === "SuperUsuario",
        permission: "permissions.view"
    },
    {
        name: "Reportes",
        href: "/reports",
        icon: BarChart3,
        visible: (roleName) => hasRole(roleName, REPORT_ROLES), permission: "productivity.delays.view"
    },
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        visible: isProjectManager, permission: "dashboard.view"
    },
    {
        name: "Roles",
        href: "/roles",
        icon: ShieldCheck,
        visible: isAdministrator, permission: "roles.view"
    },
    {
        name: "Cargos",
        href: "/job-positions",
        icon: BriefcaseBusiness,
        visible: isAdministrator, permission: "job_positions.view"
    },
    {
        name: "Departamentos",
        href: "/departments",
        icon: Building2,
        visible: isAdministrator, permission: "departments.view"
    },
    {
        name: "Empresas cliente",
        href: "/client-companies",
        icon: Handshake,
        visible: isAdministrator, permission: "client_companies.view"
    },
    {
        name: "Tipos de proyecto",
        href: "/project-types",
        icon: Tags,
        visible: isAdministrator, permission: "project_types.view"
    },
    {
        name: "Usuarios",
        href: "/users",
        icon: UsersRound,
        visible: isAdministrator, permission: "users.view"
    },
    {
        name: "Asignaciones",
        href: "/department-users",
        icon: Network,
        visible: isAdministrator, permission: "department_memberships.view"
    },
    {
        name: "Proyectos",
        href: "/projects",
        icon: FolderKanban,
        visible: isProjectManager,
        permission: "projects.view"
    },
    {
        name: "Asignaciones de proyectos",
        href: "/project-assignments",
        icon: UsersRound,
        visible: () => true,
        permission: "project_assignments.view"
    },
    {
        name: "Mi equipo",
        href: "/my-team",
        icon: UsersRound,
        visible: (roleName) => roleName === "Director", permission: "director_team.view"
    },
    {
        name: "Mis tareas",
        href: "/my-work/tasks",
        icon: ListChecks,
        visible: isWorker,
        permission: "tasks.view"
    },
    {
        name: "Mis subtareas",
        href: "/my-work/subtasks",
        icon: ListTree,
        visible: isWorker,
        permission: "subtasks.view"
    },
    {
        name: "Próximos vencimientos",
        href: "/my-work/tasks?view=due",
        icon: CalendarDays,
        visible: isWorker,
        permission: "tasks.view"
    },
    {
        name: "Subproyectos",
        href: "/subprojects",
        icon: Workflow,
        visible: isProjectManager, permission: "subprojects.view"
    },
    {
        name: "Tareas",
        href: "/tasks",
        icon: ListChecks,
        visible: isProjectManager,
        requiredPermissions: ["tasks.view", "subprojects.view"]
    },
    {
        name: "Subtareas",
        href: "/subtasks",
        icon: ListTree,
        visible: isProjectManager,
        requiredPermissions: ["subtasks.view", "tasks.view", "subprojects.view"]
    }
];

export function AppShell({
                             children
                         }: AppShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const navigationRef = useRef<HTMLElement>(null);
    const isReportsPage = pathname.startsWith("/reports");
    const isDashboardPage = pathname.startsWith("/dashboard");
    const hasTaskManagementAccess = ["tasks.view", "subprojects.view"]
        .every((permission) => hasPermission(user?.permissions, permission));
    const hasSubTaskManagementAccess = ["subtasks.view", "tasks.view", "subprojects.view"]
        .every((permission) => hasPermission(user?.permissions, permission));

    useLayoutEffect(() => {
        const savedScrollTop = window.sessionStorage.getItem("agencyflow:sidebar-scroll-top");
        const scrollTop = Number(savedScrollTop);

        if (Number.isFinite(scrollTop) && navigationRef.current) {
            navigationRef.current.scrollTop = scrollTop;
        }
    }, []);

    function preserveNavigationScroll() {
        if (navigationRef.current) {
            window.sessionStorage.setItem("agencyflow:sidebar-scroll-top", String(navigationRef.current.scrollTop));
        }
    }

    function handleNavigation() {
        preserveNavigationScroll();
        setIsMobileOpen(false);
    }

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
                className={`fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-white/[0.08] bg-[#0f2638] text-white transition-transform lg:flex lg:translate-x-0 ${
                    isMobileOpen
                        ? "flex translate-x-0"
                        : "hidden -translate-x-full"
                }`}
            >
                <div className="flex h-20 items-center justify-between border-b border-white/[0.08] px-5">
                    <Link
                        href="/dashboard"
                        className="relative h-8 w-[210px] overflow-hidden"
                        scroll={false}
                        onClick={handleNavigation}
                    >
                        <Image
                            src="/images/login/logo-flow.png"
                            alt="C&P Flow"
                            width={1983}
                            height={793}
                            priority
                            className="absolute left-0 top-0 h-auto w-full -translate-y-[24%]"
                        />
                    </Link>

                    <button
                        type="button"
                        title="Cerrar menú"
                        aria-label="Cerrar menú"
                        onClick={() => setIsMobileOpen(false)}
                        className="rounded-md p-2 text-[#94a3b8] transition-colors hover:bg-white/[0.05] hover:text-white lg:hidden"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav
                    ref={navigationRef}
                    className="flex-1 overflow-y-auto px-2 py-5"
                    style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "rgba(148, 163, 184, 0.35) transparent"
                    }}
                >
                            <p className="mb-4 px-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                        Navegación
                    </p>

                    <ul className="space-y-1">
                        {navigation.filter((item) => {
                            const hasRequiredPermission = item.requiredPermissions
                                ? item.requiredPermissions.every((permission) =>
                                    hasPermission(user?.permissions, permission)
                                )
                                : item.permission
                                    ? hasPermission(user?.permissions, item.permission)
                                    : true;
                            const isPersonalWorkEntry = item.href.startsWith("/my-work");

                            if (
                                isPersonalWorkEntry &&
                                (
                                    item.href.startsWith("/my-work/tasks")
                                        ? hasTaskManagementAccess
                                        : hasSubTaskManagementAccess
                                )
                            ) {
                                return false;
                            }

                            return hasRequiredPermission && (
                                item.visible(user?.roleName) || !isPersonalWorkEntry
                            );
                        })
                            .map((item) => {
                            const Icon = item.icon;
                            const [itemPath, itemQuery] = item.href.split("?");
                            const isActive = pathname === itemPath && (
                                itemQuery
                                    ? window.location.search === `?${itemQuery}`
                                    : item.href === "/my-work/tasks"
                                        ? !window.location.search
                                        : true
                            );

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        scroll={false}
                                        onClick={handleNavigation}
                                        className={`flex h-[46px] items-center gap-3.5 rounded-lg px-3.5 text-sm font-medium transition-colors duration-150 ${
                                             isActive
                                                 ? "bg-gradient-to-r from-[#6d32f5] to-[#4930b8] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                                                 : "text-[#e6eef7] hover:bg-white/[0.05] hover:text-white"
                                         }`}
                                    >
                                        <Icon size={20} strokeWidth={1.8} />
                                        {item.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="border-t border-white/[0.08] p-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6d32f5] to-[#4f2acd] text-sm font-bold text-white"
                        >
                            {user?.firstName?.trim().charAt(0).toUpperCase() || "U"}
                        </span>

                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                                {user?.firstName} {user?.lastName}
                            </p>

                            <p className="truncate text-xs text-[#94a3b8]">
                                {user?.jobPositionName || user?.roleName}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-3 flex h-10 w-full items-center gap-3 rounded-lg px-2 text-sm font-medium text-[#ef4444] transition-colors hover:bg-red-950/30 hover:text-red-300"
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

                    <div className="ml-auto flex items-center gap-4">
                        <NotificationBell isWorker={isWorker(user?.roleName)} />

                        <span className="h-8 w-px bg-gray-200" aria-hidden="true" />

                        <div className="flex min-w-0 items-center gap-3">
                            <span
                                aria-hidden="true"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4338ca] to-[#5b2bea] text-sm font-bold text-white shadow-sm"
                            >
                                {user?.firstName?.trim().charAt(0).toUpperCase() || "U"}
                            </span>

                            <div className="hidden min-w-0 text-left sm:block">
                                <p className="max-w-40 truncate text-sm font-semibold leading-5 text-[#111a3b]">
                                    {user?.firstName} {user?.lastName}
                                </p>

                                <p className="max-w-40 truncate text-xs leading-4 text-[#66718e]">
                                    {user?.jobPositionName || user?.roleName}
                                </p>
                            </div>

                            <ChevronDown className="hidden h-4 w-4 shrink-0 text-[#536080] sm:block" aria-hidden="true" />
                        </div>
                    </div>
                </header>

                <main className={isReportsPage
                    ? "w-full px-6 pb-5 pt-6"
                    : isDashboardPage
                        ? "mx-auto w-full p-4 xl:h-[calc(100dvh-4rem)] xl:overflow-hidden xl:px-5 xl:py-4"
                        : "mx-auto max-w-7xl p-4 sm:p-6"}>
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
