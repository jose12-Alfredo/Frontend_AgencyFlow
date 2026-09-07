"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/context/AuthContext";
import { PROJECT_MANAGER_ROLES } from "@/lib/roles";
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
import { departmentUsersService } from "@/services/department-users.service";
import { projectsService } from "@/services/projects.service";
import { subProjectsService } from "@/services/subprojects.service";
import { tasksService } from "@/services/tasks.service";
import { usersService } from "@/services/users.service";
import { PagedResult } from "@/types/common.types";
import { ClientHealthItem, DashboardData } from "@/types/dashboard.types";
import { DepartmentUser } from "@/types/department-user.types";
import { Project } from "@/types/project.types";
import { SubProject } from "@/types/subproject.types";
import { TaskItem } from "@/types/task.types";

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

async function getDashboardWithTemporalFallback(
    query: DashboardQuery = {}
): Promise<DashboardData> {
    try {
        return await dashboardService.get(query);
    } catch (error) {
        const hasTemporalFilter = query.year !== undefined || query.month !== undefined;

        if (!(error instanceof ApiError) || error.status < 500 || !hasTemporalFilter) {
            throw error;
        }

        return dashboardService.get({
            ...query,
            year: undefined,
            month: undefined
        });
    }
}

function buildDirectorCatalogs(
    projects: Project[],
    subProjects: SubProject[],
    tasks: TaskItem[],
    memberships: DepartmentUser[]
): DashboardFilterCatalogs {
    const accessibleProjectIds = new Set(
        subProjects.map((subProject) => subProject.projectId)
    );
    const scopedProjects = projects.filter(
        (project) => accessibleProjectIds.has(project.id)
    );
    const clients = new Map<string, DashboardFilterCatalogs["clients"][number]>();
    const departments = new Map<string, DashboardFilterCatalogs["departments"][number]>();
    const users = new Map<string, DashboardFilterCatalogs["users"][number]>();

    scopedProjects.forEach((project) => {
        if (project.clientCompanyId && project.clientCompanyName) {
            clients.set(project.clientCompanyId, {
                id: project.clientCompanyId,
                name: project.clientCompanyName,
                description: null,
                email: null,
                phone: null
            });
        }
    });

    subProjects.forEach((subProject) => {
        departments.set(subProject.departmentId, {
            id: subProject.departmentId,
            name: subProject.departmentName,
            description: null
        });

        if (subProject.assignedUserId) {
            users.set(subProject.assignedUserId, {
                id: subProject.assignedUserId,
                firstName: subProject.assignedUserFirstName ?? "Sin",
                lastName: subProject.assignedUserLastName ?? "responsable",
                phone: null,
                email: null,
                roleId: "",
                roleName: "Integrante",
                clientCompanyId: null,
                clientCompanyName: null
            });
        }
    });

    tasks.forEach((task) => {
        if (task.assignedUserId) {
            users.set(task.assignedUserId, {
                id: task.assignedUserId,
                firstName: task.assignedUserFirstName ?? "Sin",
                lastName: task.assignedUserLastName ?? "responsable",
                phone: null,
                email: null,
                roleId: "",
                roleName: "Integrante",
                clientCompanyId: null,
                clientCompanyName: null
            });
        }
    });

    const directedDepartmentIds = new Set(departments.keys());
    memberships.forEach((membership) => {
        if (directedDepartmentIds.has(membership.departmentId)) {
            users.set(membership.userId, {
                id: membership.userId,
                firstName: membership.userFirstName,
                lastName: membership.userLastName,
                phone: null,
                email: null,
                roleId: "",
                roleName: membership.userRoleName ?? "Integrante",
                clientCompanyId: null,
                clientCompanyName: null
            });
        }
    });

    return {
        clients: Array.from(clients.values()),
        projects: scopedProjects,
        subProjects,
        departments: Array.from(departments.values()),
        users: Array.from(users.values())
    };
}

export default function DashboardPage() {
    const { user } = useAuth();
    const roleName = user?.roleName;
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
            setDashboard(await getDashboardWithTemporalFallback({ year, month }));
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
            if (roleName === "Director") {
                const [projects, subProjects, tasks, memberships] = await Promise.all([
                    loadAllPages((page, pageSize) =>
                        projectsService.getAll({ page, pageSize })
                    ),
                    loadAllPages((page, pageSize) =>
                        subProjectsService.getAll({ page, pageSize })
                    ),
                    loadAllPages((page, pageSize) =>
                        tasksService.getAll({ page, pageSize })
                    ),
                    loadAllPages((page, pageSize) =>
                        departmentUsersService.getAll({ page, pageSize })
                    )
                ]);

                setCatalogs(buildDirectorCatalogs(projects, subProjects, tasks, memberships));
                return;
            }

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
    }, [roleName]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadDashboard();
        void loadCatalogs();
    }, [loadCatalogs, loadDashboard]);

    return (
        <RequireAuth allowedRoles={PROJECT_MANAGER_ROLES}>
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

function toClientHealthQuery(filters: DashboardFilters): DashboardQuery {
    const [year, month] = filters.period.split("-");

    return { year, month };
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
    const [clientHealth, setClientHealth] = useState<ClientHealthItem[]>(
        initialData.clientHealth ?? []
    );
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
            const dashboardRequest = getDashboardWithTemporalFallback(
                toDashboardQuery(filters)
            );
            const clientHealthRequest = getDashboardWithTemporalFallback(
                toClientHealthQuery(filters)
            );

            const [nextDashboard, allClientsDashboard] = await Promise.all([
                dashboardRequest,
                clientHealthRequest,
                refreshCatalogs ? onRefreshCatalogs() : Promise.resolve()
            ]);

            if (currentRequestId === requestId.current) {
                setData(nextDashboard);
                setClientHealth(allClientsDashboard.clientHealth ?? []);
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
            clientHealth={clientHealth}
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
