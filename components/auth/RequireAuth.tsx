"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface RequireAuthProps {
    children: ReactNode;
}

export function RequireAuth({
                                children
                            }: RequireAuthProps) {
    const router = useRouter();

    const {
        isAuthenticated,
        isLoading
    } = useAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/");
        }
    }, [isAuthenticated, isLoading, router]);

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

    return children;
}