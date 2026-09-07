"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getRoleHome } from "@/lib/roles";

interface RequireAuthProps {
    children: ReactNode;
    allowedRoles?: readonly string[];
}

export function RequireAuth({
                                children,
                                allowedRoles
                            }: RequireAuthProps) {
    const router = useRouter();

    const {
        isAuthenticated,
        isLoading,
        user
    } = useAuth();

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
            !allowedRoles.includes(user.roleName)
        ) {
            router.replace(getRoleHome(user.roleName));
        }
    }, [allowedRoles, isAuthenticated, isLoading, router, user]);

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

    if (allowedRoles && !allowedRoles.includes(user!.roleName)) {
        return <main className="flex min-h-screen items-center justify-center bg-gray-100"><p className="text-sm text-gray-600">Redirigiendo a tu espacio de trabajo…</p></main>;
    }

    return children;
}
