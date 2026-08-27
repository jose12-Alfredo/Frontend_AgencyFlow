"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { AppShell } from "@/components/layout/AppShell";
import {
    DashboardFilterCatalogs,
    DashboardFilters,
    DashboardFiltersProvider,
    useDashboardFilters
} from "@/context/DashboardFiltersContext";
import { ApiError } from "@/services/api";
import { clientCompaniesService } from "@/services/client-companies.service";
import {
    DashboardQuery,
    dashboardService
} from "@/services/dashboard.service";
import { departmentsService } from "@/services/departments.service";
import { projectsService } from "@/services/projects.service";
import { subProjectsService } from "@/services/subprojects.service";
import { usersService } from "@/services/users.service";
import { PagedResult } from "@/types/common.types";
import { DashboardData } from "@/types/dashboard.types";

const EMPTY_CATALOGS: DashboardFilterCatalogs = {
    clients: [],
    projects: [],
    subProjects: [],
    departments: [],
    users: []
};

async function loadAllPages<T>(
    loader: (page: number, pageSize: number) => Promise<PagedResult<T>>
): Promise<T[]> {
    const pageSize = 100;
    const firstPage = await loader(1, pageSize);
    const pageCount = Math.ceil(firstPage.totalItems / pageSize);
    const remainingPages = pageCount > 1
        ? await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, index) =>
                loader(index + 2, pageSize)
            )
        )
        : [];

    return [
        ...firstPage.items,
        ...remainingPages.flatMap((page) => page.items)
    ];
}

export default function DashboardPage() {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [catalogs, setCatalogs] = useState<DashboardFilterCatalogs>(
        EMPTY_CATALOGS
    );
    const [isCatalogLoading, setIsCatalogLoading] = useState(true);
    const [catalogError, setCatalogError] = useState<string | null>(null);

    const loadDashboard = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [year, month] = new Date().toISOString().slice(0, 7).split("-");
            setDashboard(await dashboardService.get({ year, month }));
        } catch (loadError) {
            setError(
                loadError instanceof ApiError
                    ? loadError.message
                    : "No se pudo cargar el dashboard gerencial."
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadCatalogs = useCallback(async () => {
        setIsCatalogLoading(true);
        setCatalogError(null);

        try {
            const [clients, projects, subProjects, departments, users] =
                await Promise.all([
                    loadAllPages((page, pageSize) =>
                        clientCompaniesService.getAll({ page, pageSize })
                    ),
                    loadAllPages((page, pageSize) =>
                        projectsService.getAll({ page, pageSize })
                    ),
                    loadAllPages((page, pageSize) =>
                        subProjectsService.getAll({ page, pageSize })
                    ),
                    loadAllPages((page, pageSize) =>
                        departmentsService.getAll({ page, pageSize })
                    ),
                    loadAllPages((page, pageSize) =>
                        usersService.getAll({ page, pageSize })
                    )
                ]);

            setCatalogs({
                clients,
                projects,
                subProjects,
                departments,
                // Reutiliza la misma regla de los formularios de asignación:
                // las cuentas Cliente no pueden actuar como responsables.
                users: users.filter((user) => user.roleName !== "Cliente")
            });
        } catch (loadError) {
            setCatalogError(
                loadError instanceof ApiError
                    ? loadError.message
                    : "No se pudieron cargar los filtros del dashboard."
            );
        } finally {
            setIsCatalogLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadDashboard();
        void loadCatalogs();
    }, [loadCatalogs, loadDashboard]);

    return (
        <RequireAuth>
            <AppShell>
                {isLoading ? (
                    <DashboardSkeleton />
                ) : error || !dashboard ? (
                    <section className="flex min-h-80 flex-col items-center justify-center border border-red-200 bg-white px-6 text-center">
                        <AlertCircle size={30} className="text-red-600" />
                        <h1 className="mt-4 text-lg font-semibold text-gray-900">
                            No se pudo abrir el dashboard
                        </h1>
                        <p className="mt-2 max-w-md text-sm text-gray-500">
                            {error ?? "El backend no devolvió información."}
                        </p>
                        <button
                            type="button"
                            onClick={() => void loadDashboard()}
                            className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-700"
                        >
                            <RefreshCw size={16} /> Reintentar
                        </button>
                    </section>
                ) : (
                    <DashboardFiltersProvider
                        catalogs={catalogs}
                        isLoading={isCatalogLoading}
                        error={catalogError}
                        onRetry={() => void loadCatalogs()}
                    >
                        <FilteredDashboard
                            initialData={dashboard}
                            onRefreshCatalogs={loadCatalogs}
                        />
                    </DashboardFiltersProvider>
                )}
            </AppShell>
        </RequireAuth>
    );
}

function toDashboardQuery(filters: DashboardFilters): DashboardQuery {
    const [year, month] = filters.period.split("-");

    return {
        clientCompanyId: filters.clientCompanyId || undefined,
        projectId: filters.projectId || undefined,
        subProjectId: filters.subProjectId || undefined,
        departmentId: filters.departmentId || undefined,
        responsibleUserId: filters.responsibleUserId || undefined,
        year,
        month
    };
}

function FilteredDashboard({
    initialData,
    onRefreshCatalogs
}: {
    initialData: DashboardData;
    onRefreshCatalogs: () => Promise<void>;
}) {
    const { filters } = useDashboardFilters();
    const [data, setData] = useState(initialData);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshError, setRefreshError] = useState<string | null>(null);
    const isInitialRender = useRef(true);
    const requestId = useRef(0);

    const loadFilteredDashboard = useCallback(async (
        refreshCatalogs = false
    ) => {
        const currentRequestId = ++requestId.current;
        setIsRefreshing(true);
        setRefreshError(null);

        try {
            const dashboardRequest = dashboardService.get(
                toDashboardQuery(filters)
            );

            const [nextDashboard] = await Promise.all([
                dashboardRequest,
                refreshCatalogs ? onRefreshCatalogs() : Promise.resolve()
            ]);

            if (currentRequestId === requestId.current) {
                setData(nextDashboard);
            }
        } catch (loadError) {
            if (currentRequestId === requestId.current) {
                setRefreshError(
                    loadError instanceof ApiError
                        ? loadError.message
                        : "No se pudieron actualizar los KPI para este contexto."
                );
            }
        } finally {
            if (currentRequestId === requestId.current) {
                setIsRefreshing(false);
            }
        }
    }, [filters, onRefreshCatalogs]);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        void loadFilteredDashboard();
    }, [loadFilteredDashboard]);

    return (
        <ManagerDashboard
            data={data}
            isRefreshing={isRefreshing}
            refreshError={refreshError}
            onRefresh={() => void loadFilteredDashboard(true)}
        />
    );
}

function DashboardSkeleton() {
    return (
        <div className="animate-pulse space-y-6" aria-label="Cargando dashboard">
            <div className="h-16 w-full bg-gray-200" />
            <div className="h-40 rounded-md border border-gray-200 bg-white sm:h-28" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-32 border border-gray-200 bg-white" />
                ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
                <div className="h-80 border border-gray-200 bg-white" />
                <div className="h-80 border border-gray-200 bg-white" />
            </div>
        </div>
    );
}
