"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Building2,
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

interface AppShellProps {
    children: ReactNode;
}

const navigation = [
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard
    },
    {
        name: "Roles",
        href: "/roles",
        icon: ShieldCheck
    },
    {
        name: "Departamentos",
        href: "/departments",
        icon: Building2
    },
    {
        name: "Empresas cliente",
        href: "/client-companies",
        icon: Handshake
    },
    {
        name: "Tipos de proyecto",
        href: "/project-types",
        icon: Tags
    },
    {
        name: "Usuarios",
        href: "/users",
        icon: UsersRound
    },
    {
        name: "Asignaciones",
        href: "/department-users",
        icon: Network
    },
    {
        name: "Proyectos",
        href: "/projects",
        icon: FolderKanban
    },
    {
        name: "Subproyectos",
        href: "/subprojects",
        icon: Workflow
    },
    {
        name: "Tareas",
        href: "/tasks",
        icon: ListChecks
    },
    {
        name: "Subtareas",
        href: "/subtasks",
        icon: ListTree
    }
];

export function AppShell({
                             children
                         }: AppShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

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
                className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:translate-x-0 ${
                    isMobileOpen
                        ? "translate-x-0"
                        : "-translate-x-full"
                }`}
            >
                <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3"
                        onClick={() => setIsMobileOpen(false)}
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-900 text-sm font-bold text-white">
                            AF
                        </span>

                        <span className="font-semibold text-gray-900">
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
                        General
                    </p>

                    <ul>
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={() =>
                                            setIsMobileOpen(false)
                                        }
                                        className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                                            isActive
                                                ? "bg-gray-900 text-white"
                                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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

                <div className="border-t border-gray-200 p-4">
                    <div className="mb-4 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                            {user?.firstName} {user?.lastName}
                        </p>

                        <p className="truncate text-xs text-gray-500">
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
                <header className="sticky top-0 z-20 flex h-16 items-center border-b border-gray-200 bg-white px-4 sm:px-6">
                    <button
                        type="button"
                        title="Abrir menú"
                        aria-label="Abrir menú"
                        onClick={() => setIsMobileOpen(true)}
                        className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
                    >
                        <Menu size={22} />
                    </button>

                    <div className="ml-auto text-right">
                        <p className="text-sm font-medium text-gray-900">
                            {user?.firstName} {user?.lastName}
                        </p>

                        <p className="text-xs text-gray-500">
                            {user?.roleName}
                        </p>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl p-4 sm:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
