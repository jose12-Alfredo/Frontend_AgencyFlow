"use client";

import {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import { useSearchParams } from "next/navigation";
import { CircleAlert, ClipboardList, LayoutGrid, List, Plus, RefreshCw, Search } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PROJECT_MANAGER_ROLES, hasPermission, isAdministrator } from "@/lib/roles";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { WorkHierarchyBreadcrumbs } from "@/components/navigation/WorkHierarchyBreadcrumbs";
import { TaskDeleteDialog } from "@/components/tasks/TaskDeleteDialog";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { TaskKanbanColumn } from "@/components/tasks/TaskKanbanColumn";
import { TaskListView } from "@/components/tasks/TaskListView";
import { ApiError } from "@/services/api";
import { clientCompaniesService } from "@/services/client-companies.service";
import { projectsService } from "@/services/projects.service";
import { subProjectsService } from "@/services/subprojects.service";
import { tasksService } from "@/services/tasks.service";
import { usersService } from "@/services/users.service";
import { departmentUsersService } from "@/services/department-users.service";
import { directorTeamService } from "@/services/director-team.service";
import { loadAllPages } from "@/services/pagination";
import {
    authUserToAssignableUser,
    getAssignableUsers,
    membershipsToAssignableUsers
} from "@/lib/assignment";
import { ClientCompany } from "@/types/client-company.types";
import { Project } from "@/types/project.types";
import { SubProject } from "@/types/subproject.types";
import { TaskItem } from "@/types/task.types";
import { User } from "@/types/user.types";

const ALL = "ALL";

const TASK_COLUMNS = [
    {
        title: "Pendiente",
        color: "gray" as const,
        matches: (status: string) => status === "Pendiente"
    },
    {
        title: "En proceso",
        color: "blue" as const,
        matches: (status: string) =>
            status === "En curso" || status === "En proceso"
    },
    {
        title: "En revisión",
        color: "violet" as const,
        matches: (status: string) => status === "En revisión"
    },
    {
        title: "Completada",
        color: "emerald" as const,
        matches: (status: string) =>
            status === "Completado" || status === "Completada"
    }
];

function TaskKpi({ title, count }: { title: string; count: number }) {
    const tones: Record<string, string> = {
        Pendiente: "bg-slate-50 text-slate-700",
        "En proceso": "bg-blue-50 text-blue-700",
        "En revisión": "bg-violet-50 text-violet-700",
        Completada: "bg-emerald-50 text-emerald-700"
    };

    return (
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 sm:border-r xl:border-b-0">
            <span className={`flex size-9 items-center justify-center rounded-lg ${tones[title] ?? "bg-gray-50 text-gray-700"}`}>
                <ClipboardList size={18} />
            </span>
            <div>
                <p className="text-2xl font-semibold text-gray-950">{count}</p>
                <p className="text-xs font-medium text-gray-500">{title}</p>
            </div>
        </div>
    );
}

export default function TasksPage() {
    return (
        <Suspense fallback={<div className="p-6 text-sm text-gray-500">Cargando tareas...</div>}>
            <TasksContent />
        </Suspense>
    );
}

function TasksContent() {
    const { user } = useAuth();
    const canAdminister = isAdministrator(user?.roleName);
    const canViewUsers = hasPermission(user?.permissions, "users.view");
    const canViewMemberships = hasPermission(user?.permissions, "department_memberships.view");
    const canAssignTasks = hasPermission(user?.permissions, "tasks.assign");
    const searchParams = useSearchParams();
    const initialized = useRef(false);
    const [clients, setClients] = useState<ClientCompany[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [subProjects, setSubProjects] = useState<SubProject[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [clientCompanyId, setClientCompanyId] = useState(ALL);
    const [projectId, setProjectId] = useState(ALL);
    const [subProjectId, setSubProjectId] = useState(ALL);
    const [assignedUserId, setAssignedUserId] = useState(ALL);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"board" | "list">("board");
    const [isCatalogLoading, setIsCatalogLoading] = useState(true);
    const [isTasksLoading, setIsTasksLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<TaskItem | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);

    const loadCatalogs = useCallback(async () => {
        setIsCatalogLoading(true);
        setError(null);

        try {
            const [administratorClients, loadedProjects, visibleSubProjects] =
                await Promise.all([
                    canAdminister
                        ? loadAllPages((page, pageSize) => clientCompaniesService.getAll({ page, pageSize }))
                        : Promise.resolve([] as ClientCompany[]),
                    loadAllPages((page, pageSize) => projectsService.getAll({ page, pageSize })),
                    loadAllPages((page, pageSize) => subProjectsService.getAll({ page, pageSize }))
                ]);

            let loadedUsers: User[];

            if (canViewUsers) {
                loadedUsers = await loadAllPages((page, pageSize) =>
                    usersService.getAll({ page, pageSize })
                );
            } else if (user?.roleName === "Director") {
                const managedDepartments = await directorTeamService.getDepartments();
                const memberships = (await Promise.all(
                    managedDepartments.map((department) =>
                        directorTeamService.getMembers(department.id)
                    )
                )).flat();
                loadedUsers = membershipsToAssignableUsers(memberships);
            } else if (canViewMemberships) {
                loadedUsers = membershipsToAssignableUsers(
                    await loadAllPages((page, pageSize) =>
                        departmentUsersService.getAll({ page, pageSize })
                    )
                );
            } else if (canAssignTasks && visibleSubProjects.length > 0) {
                const projectIds = Array.from(new Set(
                    visibleSubProjects.map((subProject) => subProject.projectId)
                ));
                const projectOptions = await Promise.all(
                    projectIds.map((visibleProjectId) =>
                        subProjectsService.getFormOptions(visibleProjectId)
                    )
                );
                loadedUsers = Array.from(new Map(
                    projectOptions.flatMap((options) => options.users).map(option => [option.id, {
                        id: option.id,
                        firstName: option.firstName,
                        lastName: option.lastName,
                        phone: null,
                        email: null,
                        roleId: "",
                        roleName: "Usuario interno",
                        jobPositionId: null,
                        jobPositionName: null,
                        clientCompanyId: null,
                        clientCompanyName: null
                    } as User])
                ).values());
            } else {
                loadedUsers = user ? [authUserToAssignableUser(user)] : [];
            }
            const visibleProjectIds = new Set(
                visibleSubProjects.map((subProject) => subProject.projectId)
            );
            const visibleProjects = loadedProjects.filter(
                (project) => visibleProjectIds.has(project.id)
            );
            const directorClients = Array.from(new Map(
                visibleProjects
                    .filter((project) => project.clientCompanyId && project.clientCompanyName)
                    .map((project) => [project.clientCompanyId!, {
                        id: project.clientCompanyId!,
                        name: project.clientCompanyName!,
                        description: null,
                        email: null,
                        phone: null
                    } as ClientCompany])
            ).values());
            const loadedClients = canAdminister ? administratorClients : directorClients;

            setClients(loadedClients);
            setProjects(visibleProjects);
            setSubProjects(visibleSubProjects);
            setUsers(loadedUsers);

            if (!initialized.current) {
                const requestedProjectId = searchParams.get("projectId") ?? ALL;
                const requestedSubProjectId =
                    searchParams.get("subProjectId") ?? ALL;
                const requestedClientId =
                    searchParams.get("clientCompanyId") ?? ALL;
                const requestedAssignedUserId =
                    searchParams.get("assignedUserId") ?? ALL;
                const requestedSubProject = visibleSubProjects.find(
                    (subProject) => subProject.id === requestedSubProjectId
                );
                const requestedProject = visibleProjects.find(
                    (project) =>
                        project.id ===
                        (requestedProjectId === ALL
                            ? requestedSubProject?.projectId
                            : requestedProjectId)
                );
                const validRequestedClient =
                    requestedClientId === ALL ||
                    loadedClients.some(
                        (client) => client.id === requestedClientId
                    );
                const initialClientId = validRequestedClient
                    ? requestedClientId
                    : requestedProject?.clientCompanyId ?? ALL;
                const initialProject = requestedProject && (
                    initialClientId === ALL ||
                    requestedProject.clientCompanyId === initialClientId
                )
                    ? requestedProject
                    : null;
                const requestedSubProjectExists = visibleSubProjects.some(
                    (subProject) =>
                        subProject.id === requestedSubProjectId &&
                        subProject.projectId === initialProject?.id
                );

                setClientCompanyId(initialClientId);
                setProjectId(initialProject?.id ?? ALL);
                setSubProjectId(
                    requestedSubProjectExists ? requestedSubProjectId : ALL
                );
                setAssignedUserId(
                    requestedAssignedUserId === ALL ||
                    loadedUsers.some((loadedUser) => loadedUser.id === requestedAssignedUserId)
                        ? requestedAssignedUserId
                        : ALL
                );
                initialized.current = true;
            }
        } catch (loadError) {
            setError(
                loadError instanceof ApiError
                    ? loadError.message
                    : "No se pudieron cargar los filtros de tareas."
            );
        } finally {
            setIsCatalogLoading(false);
        }
    }, [canAdminister, canAssignTasks, canViewMemberships, canViewUsers, searchParams, user]);

    const loadTasks = useCallback(async () => {
        if (!initialized.current) {
            return;
        }

        setIsTasksLoading(true);
        setError(null);

        try {
            const filters = {
                page: 1,
                pageSize: 100,
                clientCompanyId:
                    clientCompanyId === ALL ? undefined : clientCompanyId,
                projectId: projectId === ALL ? undefined : projectId,
                subProjectId:
                    subProjectId === ALL ? undefined : subProjectId
            };
            const firstPage = await tasksService.getAll(filters);
            const pageCount = Math.ceil(firstPage.totalItems / 100);
            const remainingPages = pageCount > 1
                ? await Promise.all(
                    Array.from({ length: pageCount - 1 }, (_, index) =>
                        tasksService.getAll({
                            ...filters,
                            page: index + 2
                        })
                    )
                )
                : [];

            const loadedTasks = [
                ...firstPage.items,
                ...remainingPages.flatMap((page) => page.items)
            ];
            const allowedSubProjectIds = new Set(subProjects.map((subProject) => subProject.id));
            const visibleTasks = canAdminister
                ? loadedTasks
                : loadedTasks.filter((task) => allowedSubProjectIds.has(task.subProjectId));
            setTasks(visibleTasks);
            setUsers((currentUsers) => {
                const responsibleUsers = new Map(
                    currentUsers.map((currentUser) => [currentUser.id, currentUser])
                );

                visibleTasks.forEach((task) => {
                    if (!task.assignedUserId) return;

                    responsibleUsers.set(task.assignedUserId, {
                        id: task.assignedUserId,
                        firstName: task.assignedUserFirstName ?? "Usuario",
                        lastName: task.assignedUserLastName ?? "",
                        phone: null,
                        email: null,
                        roleId: "",
                        roleName: "Usuario interno",
                        jobPositionId: null,
                        jobPositionName: null,
                        clientCompanyId: null,
                        clientCompanyName: null
                    });
                });

                return Array.from(responsibleUsers.values());
            });
        } catch (loadError) {
            setError(
                loadError instanceof ApiError
                    ? loadError.message
                    : "No se pudieron cargar las tareas."
            );
        } finally {
            setIsTasksLoading(false);
        }
    }, [canAdminister, clientCompanyId, projectId, subProjectId, subProjects]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadCatalogs();
    }, [loadCatalogs]);

    useEffect(() => {
        if (initialized.current) {
            void loadTasks();
        }
    }, [loadTasks]);

    const visibleProjects = useMemo(
        () => projects.filter(
            (project) =>
                clientCompanyId === ALL ||
                project.clientCompanyId === clientCompanyId
        ),
        [clientCompanyId, projects]
    );
    const visibleSubProjects = useMemo(() => {
        const visibleProjectIds = new Set(
            visibleProjects.map((project) => project.id)
        );

        return subProjects.filter((subProject) =>
            projectId === ALL
                ? visibleProjectIds.has(subProject.projectId)
                : subProject.projectId === projectId
        );
    }, [projectId, subProjects, visibleProjects]);
    const selectedProject = projects.find(
        (project) => projectId !== ALL && project.id === projectId
    );
    const selectedSubProject = visibleSubProjects.find(
        (subProject) => subProjectId !== ALL && subProject.id === subProjectId
    );
    const assignableUsers = useMemo(
        () => getAssignableUsers(users).sort((first, second) =>
            `${first.firstName} ${first.lastName}`.localeCompare(
                `${second.firstName} ${second.lastName}`,
                "es"
            )
        ),
        [users]
    );
    const responsibleOptions = useMemo(() => {
        const responsibleUsers = new Map<string, User>();

        tasks.forEach((task) => {
            if (!task.assignedUserId) return;

            responsibleUsers.set(task.assignedUserId, {
                id: task.assignedUserId,
                firstName: task.assignedUserFirstName ?? "Usuario",
                lastName: task.assignedUserLastName ?? "",
                phone: null,
                email: null,
                roleId: "",
                roleName: "Usuario interno",
                jobPositionId: null,
                jobPositionName: null,
                clientCompanyId: null,
                clientCompanyName: null
            });
        });

        return Array.from(responsibleUsers.values()).sort((first, second) =>
            `${first.firstName} ${first.lastName}`.localeCompare(
                `${second.firstName} ${second.lastName}`,
                "es"
            )
        );
    }, [tasks]);
    const selectedAssignedUser = responsibleOptions.find(
        (responsibleUser) => assignedUserId !== ALL && responsibleUser.id === assignedUserId
    );

    function updateUrl(
        nextClientId: string,
        nextProjectId: string,
        nextSubProjectId: string,
        nextAssignedUserId: string = assignedUserId
    ) {
        const params = new URLSearchParams();
        if (nextClientId !== ALL) {
            params.set("clientCompanyId", nextClientId);
        }
        if (nextProjectId !== ALL) {
            params.set("projectId", nextProjectId);
        }
        if (nextSubProjectId !== ALL) {
            params.set("subProjectId", nextSubProjectId);
        }
        if (nextAssignedUserId !== ALL) {
            params.set("assignedUserId", nextAssignedUserId);
        }
        window.history.replaceState(null, "", `/tasks?${params.toString()}`);
    }

    function handleClientChange(nextClientId: string) {
        setClientCompanyId(nextClientId);
        setProjectId(ALL);
        setSubProjectId(ALL);
        setAssignedUserId(ALL);
        updateUrl(nextClientId, ALL, ALL, ALL);
    }

    function handleProjectChange(nextProjectId: string) {
        setProjectId(nextProjectId);
        setSubProjectId(ALL);
        setAssignedUserId(ALL);
        updateUrl(clientCompanyId, nextProjectId, ALL, ALL);
    }

    function handleSubProjectChange(nextSubProjectId: string) {
        setSubProjectId(nextSubProjectId);
        setAssignedUserId(ALL);
        updateUrl(clientCompanyId, projectId, nextSubProjectId, ALL);
    }

    function handleAssignedUserChange(nextAssignedUserId: string) {
        setAssignedUserId(nextAssignedUserId);
        updateUrl(clientCompanyId, projectId, subProjectId, nextAssignedUserId);
    }

    const isLoading = isCatalogLoading || isTasksLoading;
    const tasksForResponsible = useMemo(
        () => assignedUserId === ALL
            ? tasks
            : tasks.filter((task) => task.assignedUserId === assignedUserId),
        [assignedUserId, tasks]
    );
    const taskKpis = useMemo(
        () => TASK_COLUMNS.map((column) => ({
            title: column.title,
            count: tasksForResponsible.filter((task) => column.matches(task.status)).length
        })),
        [tasksForResponsible]
    );
    const overdueTaskCount = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);

        return tasksForResponsible.filter((task) =>
            Boolean(
                task.endDate &&
                task.endDate < today &&
                task.status !== "Completado" &&
                task.status !== "Completada"
            )
        ).length;
    }, [tasksForResponsible]);
    const filteredTasks = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) {
            return tasksForResponsible;
        }

        return tasksForResponsible.filter((task) => [
            task.title,
            task.detail,
            task.clientCompanyName,
            task.projectTitle,
            task.subProjectTitle,
            task.assignedUserFirstName,
            task.assignedUserLastName,
            [task.assignedUserFirstName, task.assignedUserLastName]
                .filter(Boolean)
                .join(" ")
        ].some((value) => value?.toLowerCase().includes(term)));
    }, [search, tasksForResponsible]);

    return (
        <RequireAuth allowedRoles={PROJECT_MANAGER_ROLES}>
            <AppShell>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        {selectedProject && selectedSubProject && (
                            <div className="mb-3"><WorkHierarchyBreadcrumbs items={[
                                { type: "Cliente", label: selectedProject.clientCompanyName ?? "Sin empresa cliente", href: selectedProject.clientCompanyId ? `/client-companies/${selectedProject.clientCompanyId}` : undefined },
                                { type: "Proyecto", label: selectedProject.title, href: `/projects/${selectedProject.id}` },
                                { type: "Subproyecto", label: selectedSubProject.title, href: `/subprojects/${selectedSubProject.id}` },
                                { type: "Tarea", label: "Todas las tareas" }
                            ]} /></div>
                        )}
                        <p className="text-sm font-medium text-blue-600">Control de producción</p>
                        <h1 className="mt-1 text-2xl font-semibold text-gray-950">Tareas</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Trabajo principal organizado por cliente, proyecto y avance.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setTaskToEdit(null);
                                setIsFormOpen(true);
                            }}
                            disabled={isLoading || visibleSubProjects.length === 0}
                            className="flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus size={18} />
                            Nueva tarea
                        </button>
                        <div
                            role="group"
                            aria-label="Vista de tareas"
                            className="flex h-10 items-center rounded-md border border-gray-300 bg-white p-1"
                        >
                            <button
                                type="button"
                                onClick={() => setViewMode("board")}
                                aria-pressed={viewMode === "board"}
                                className={`flex h-8 items-center gap-2 rounded px-3 text-sm font-medium ${viewMode === "board" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                            >
                                <LayoutGrid size={16} />
                                Tablero
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("list")}
                                aria-pressed={viewMode === "list"}
                                className={`flex h-8 items-center gap-2 rounded px-3 text-sm font-medium ${viewMode === "list" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                            >
                                <List size={16} />
                                Lista
                            </button>
                        </div>
                        <button
                            type="button"
                            title="Actualizar tareas"
                            aria-label="Actualizar tareas"
                            onClick={() => void loadTasks()}
                            disabled={isLoading}
                            className="rounded-md border border-gray-300 bg-white p-2.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RefreshCw size={19} className={isLoading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {error && (
                    <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <section className="mb-5 grid overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-5">
                    {taskKpis.map((kpi) => (
                        <TaskKpi key={kpi.title} title={kpi.title} count={kpi.count} />
                    ))}
                    <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4 sm:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
                            <CircleAlert size={18} />
                        </span>
                        <div>
                            <p className="text-2xl font-semibold text-gray-950">{overdueTaskCount}</p>
                            <p className="text-xs font-medium text-gray-500">Atrasadas</p>
                        </div>
                    </div>
                </section>

                <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                            <label htmlFor="task-client" className="mb-1.5 block text-xs font-semibold uppercase text-gray-500">
                                Cliente
                            </label>
                            <select
                                id="task-client"
                                value={clientCompanyId}
                                onChange={(event) => handleClientChange(event.target.value)}
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value={ALL}>Todos los clientes</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="task-project" className="mb-1.5 block text-xs font-semibold uppercase text-gray-500">
                                Proyecto
                            </label>
                            <select
                                id="task-project"
                                value={projectId}
                                onChange={(event) => handleProjectChange(event.target.value)}
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value={ALL}>Todos los proyectos</option>
                                {visibleProjects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.title} · {project.clientCompanyName ?? "Sin cliente"}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="task-subproject" className="mb-1.5 block text-xs font-semibold uppercase text-gray-500">
                                Subproyecto
                            </label>
                            <select
                                id="task-subproject"
                                value={subProjectId}
                                onChange={(event) => handleSubProjectChange(event.target.value)}
                                disabled={projectId === ALL}
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                            >
                                <option value={ALL}>Todos los subproyectos</option>
                                {visibleSubProjects.map((subProject) => (
                                    <option key={subProject.id} value={subProject.id}>{subProject.title}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="task-assignee" className="mb-1.5 block text-xs font-semibold uppercase text-gray-500">
                                Responsable
                            </label>
                            <select
                                id="task-assignee"
                                value={assignedUserId}
                                onChange={(event) => handleAssignedUserChange(event.target.value)}
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value={ALL}>Todos los responsables</option>
                                {responsibleOptions.map((responsibleUser) => (
                                    <option key={responsibleUser.id} value={responsibleUser.id}>
                                        {responsibleUser.firstName} {responsibleUser.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <label className="relative mt-4 block">
                        <span className="sr-only">Buscar tareas</span>
                        <Search
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar tareas..."
                            className="h-11 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                    </label>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                        <p>
                            {clientCompanyId === ALL
                                ? "Todos los clientes"
                                : clients.find((client) => client.id === clientCompanyId)?.name}
                            <span className="px-2 text-gray-300">/</span>
                            {selectedProject?.title ?? "Todos los proyectos"}
                            <span className="px-2 text-gray-300">/</span>
                            {subProjectId === ALL
                                ? "Todos los subproyectos"
                                : visibleSubProjects.find((item) => item.id === subProjectId)?.title}
                            <span className="px-2 text-gray-300">/</span>
                            {selectedAssignedUser
                                ? `${selectedAssignedUser.firstName} ${selectedAssignedUser.lastName}`
                                : "Todos los responsables"}
                        </p>
                        <span className="font-semibold text-gray-700">
                            {filteredTasks.length} {filteredTasks.length === 1 ? "tarea" : "tareas"}
                        </span>
                    </div>
                </section>

                {isLoading && tasks.length === 0 ? (
                    <div className="flex h-72 items-center justify-center rounded-md border border-gray-200 bg-white text-sm text-gray-500">
                        Cargando tareas...
                    </div>
                ) : viewMode === "board" ? (
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {TASK_COLUMNS.map((column) => (
                            <TaskKanbanColumn
                                key={column.title}
                                title={column.title}
                                color={column.color}
                                tasks={filteredTasks.filter((task) => column.matches(task.status))}
                                onEdit={(task) => {
                                    setTaskToEdit(task);
                                    setIsFormOpen(true);
                                }}
                                onDelete={setTaskToDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <TaskListView
                        tasks={filteredTasks}
                        onEdit={(task) => {
                            setTaskToEdit(task);
                            setIsFormOpen(true);
                        }}
                        onDelete={setTaskToDelete}
                    />
                )}

                {isFormOpen && (
                    <TaskFormModal
                        task={taskToEdit}
                        subProjects={visibleSubProjects}
                        users={assignableUsers}
                        initialSubProjectId={
                            subProjectId === ALL ? "" : subProjectId
                        }
                        onClose={() => {
                            setIsFormOpen(false);
                            setTaskToEdit(null);
                        }}
                        onSaved={loadTasks}
                    />
                )}

                {taskToDelete && (
                    <TaskDeleteDialog
                        task={taskToDelete}
                        onClose={() => setTaskToDelete(null)}
                        onDeleted={loadTasks}
                    />
                )}
            </AppShell>
        </RequireAuth>
    );
}
