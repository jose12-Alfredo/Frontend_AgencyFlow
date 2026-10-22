"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getRoleHome } from "@/lib/roles";

interface RequireAuthProps {
    children: ReactNode;
    allowedRoles?: readonly string[];
    allowedPermission?: string;
}

export function RequireAuth({
                                children,
                                allowedRoles,
                                allowedPermission
                            }: RequireAuthProps) {
    const router = useRouter();
    const pathname = usePathname();
    const routePermissions: Record<string, string[]> = {
        "/dashboard": ["dashboard.view"], "/reports": ["productivity.delays.view"],
        "/roles": ["roles.view"], "/users": ["users.view"], "/job-positions": ["job_positions.view"],
        "/departments": ["departments.view"], "/department-users": ["department_memberships.view"],
        "/client-companies": ["client_companies.view"], "/project-types": ["project_types.view"],
        "/projects": ["projects.view"],
        "/project-assignments": ["project_assignments.view"],
        "/subprojects": ["subprojects.view"], "/tasks": ["tasks.view", "subprojects.view"],
        "/subtasks": ["subtasks.view", "tasks.view", "subprojects.view"],
        "/my-team": ["director_team.view"]
    };
    const routePermission = Object.entries(routePermissions).find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1];
    const {
        isAuthenticated,
        isLoading,
        user
    } = useAuth();
    const hasRoutePermission = Boolean(routePermission?.every((permission) => user?.permissions?.includes(permission)));

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/");
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        if (
            !isLoading &&
            isAuthenticated &&
            user &&
            allowedRoles &&
            !allowedRoles.includes(user.roleName) &&
            !(allowedPermission && user.permissions?.includes(allowedPermission)) &&
            !hasRoutePermission
        ) {
            router.replace(getRoleHome(user.roleName));
        }
    }, [allowedPermission, allowedRoles, hasRoutePermission, isAuthenticated, isLoading, router, user]);

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-100">
                <p className="text-sm text-gray-600">
                    Cargando sesión...
                </p>
            </main>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (allowedRoles && !allowedRoles.includes(user!.roleName) &&
        !(allowedPermission && user!.permissions?.includes(allowedPermission)) && !hasRoutePermission) {
        return <main className="flex min-h-screen items-center justify-center bg-gray-100"><p className="text-sm text-gray-600">Redirigiendo a tu espacio de trabajo…</p></main>;
    }

    return children;
}
