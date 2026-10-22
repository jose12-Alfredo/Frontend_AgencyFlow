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
import {
    CollisionDetection,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    pointerWithin,
    rectIntersection,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import {
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    FileText,
    GripVertical,
    Plus,
    RefreshCw
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PROJECT_MANAGER_ROLES, hasPermission, isAdministrator } from "@/lib/roles";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { WorkHierarchyBreadcrumbs } from "@/components/navigation/WorkHierarchyBreadcrumbs";
import { SubTaskCommentsModal } from "@/components/subtasks/SubTaskCommentsModal";
import { SubTaskFormModal } from "@/components/subtasks/SubTaskFormModal";
import { SubTaskStatusColumn } from "@/components/tasks/SubTaskStatusColumn";
import { ApiError } from "@/services/api";
import { subProjectsService } from "@/services/subprojects.service";
import { subTasksService } from "@/services/subtasks.service";
import { tasksService } from "@/services/tasks.service";
import { usersService } from "@/services/users.service";
import { departmentUsersService } from "@/services/department-users.service";
import { loadAllPages } from "@/services/pagination";
import {
    authUserToAssignableUser,
    getAssignableUsers,
    membershipsToAssignableUsers
} from "@/lib/assignment";
import { SubProject } from "@/types/subproject.types";
import {
    SUBTASK_STATUSES,
    SubTask,
    SubTaskStatus
} from "@/types/subtask.types";
import { TaskItem } from "@/types/task.types";
import { User } from "@/types/user.types";

interface NewSubTaskState {
    taskId?: string;
    status: SubTaskStatus;
}

const boardCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);

    return pointerCollisions.length > 0
        ? pointerCollisions
        : rectIntersection(args);
};

const KANBAN_STATUSES = SUBTASK_STATUSES.filter(
    (status) => status !== "Pausada"
);
const UNASSIGNED_CLIENT_ID = "__unassigned_client__";

function getClientFilterId(clientCompanyId: string | null): string {
    return clientCompanyId ?? UNASSIGNED_CLIENT_ID;
}

function calculateIsOverdue(
    endDate: string | null,
    status: SubTaskStatus
): boolean {
    if (!endDate || status === "Completada") {
        return false;
    }

    return endDate < new Date().toISOString().slice(0, 10);
}

function formatDateOnly(value: string): string {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-BO", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(new Date(year, month - 1, day));
}

function formatCreatedAt(value: string): string {
    return new Intl.DateTimeFormat("es-BO", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(new Date(value));
}

function getTaskStatusClass(status: string): string {
    if (status === "Completado") {
        return "bg-emerald-50 text-emerald-700";
    }

    if (status === "En curso") {
        return "bg-blue-50 text-blue-700";
    }

    return "bg-gray-100 text-gray-700";
}

function getTaskSchedule(task: TaskItem) {
    if (task.status === "Completado" || task.status === "Completada") {
        return {
            label: "Completada",
            className: "bg-emerald-50 text-emerald-700"
        };
    }

    if (!task.endDate) {
        return {
            label: "Sin fecha límite",
            className: "bg-gray-100 text-gray-600"
        };
    }

    const now = new Date();
    const today = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );
    const [year, month, day] = task.endDate.split("-").map(Number);
    const dueDate = Date.UTC(year, month - 1, day);
    const difference = Math.round(
        (dueDate - today) / (1000 * 60 * 60 * 24)
    );

    if (difference < 0) {
        const overdueDays = Math.abs(difference);
        return {
            label: `${overdueDays} ${overdueDays === 1 ? "día" : "días"} de atraso`,
            className: "bg-red-50 text-red-700"
        };
    }

    if (difference === 0) {
        return {
            label: "Vence hoy",
            className: "bg-amber-50 text-amber-800"
        };
    }

    return {
        label: `${difference} ${difference === 1 ? "día restante" : "días restantes"}`,
        className: difference <= 3
            ? "bg-amber-50 text-amber-800"
            : "bg-blue-50 text-blue-700"
    };
}

export default function SubTasksPage() {
    return (
        <Suspense
            fallback={
                <div className="p-6 text-sm text-gray-500">
                    Cargando tareas...
                </div>
            }
        >
            <TasksContent />
        </Suspense>
    );
}

function TasksContent() {
    const { user } = useAuth();
    const canAdminister = isAdministrator(user?.roleName);
    const canViewUsers = hasPermission(user?.permissions, "users.view");
    const canViewMemberships = hasPermission(user?.permissions, "department_memberships.view");
    const canAssignSubTasks = hasPermission(user?.permissions, "subtasks.assign");
    const canCreateSubTasks = user?.roleName === "Director" ||
        hasPermission(user?.permissions, "subtasks.create");
    const searchParams = useSearchParams();
    const requestedClientCompanyId =
        searchParams.get("clientCompanyId") ?? "";
    const requestedProjectId =
        searchParams.get("projectId") ?? "";
    const requestedSubProjectId =
        searchParams.get("subProjectId") ?? "";
    const requestedTaskId = searchParams.get("taskId") ?? "";
    const appliedSelectionKey = useRef<string | null>(null);
    const isBackgroundRefreshing = useRef(false);
    const statusUpdatesRef = useRef(new Set<string>());
    const dataGenerationRef = useRef(0);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [subTasks, setSubTasks] = useState<SubTask[]>([]);
    const [subProjects, setSubProjects] = useState<SubProject[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedClientCompanyId, setSelectedClientCompanyId] =
        useState("");
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [selectedSubProjectId, setSelectedSubProjectId] = useState("");
    const [selectedTaskId, setSelectedTaskId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newSubTask, setNewSubTask] = useState<NewSubTaskState | null>(null);
    const [subTaskToEdit, setSubTaskToEdit] = useState<SubTask | null>(null);
    const [selectedSubTask, setSelectedSubTask] =
        useState<SubTask | null>(null);
    const [activeSubTask, setActiveSubTask] = useState<SubTask | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 }
        }),
        useSensor(KeyboardSensor)
    );

    const loadData = useCallback(async (isBackgroundRefresh = false) => {
        if (isBackgroundRefresh && statusUpdatesRef.current.size > 0) {
            return;
        }

        const dataGeneration = dataGenerationRef.current;

        if (!isBackgroundRefresh) {
            setIsLoading(true);
            setError(null);
        }

        try {
            const [
                loadedTasks,
                loadedSubTasks,
                visibleSubProjects
            ] = await Promise.all([
                loadAllPages((page, pageSize) => tasksService.getAll({ page, pageSize })),
                loadAllPages((page, pageSize) => subTasksService.getAll({ page, pageSize })),
                loadAllPages((page, pageSize) => subProjectsService.getAll({ page, pageSize }))
            ]);

            const loadedUsers: User[] = canViewUsers
                ? await loadAllPages((page, pageSize) => usersService.getAll({ page, pageSize }))
                : canAssignSubTasks && visibleSubProjects.length > 0
                    ? (await subProjectsService.getFormOptions(visibleSubProjects[0].projectId)).users.map(option => ({
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
                    }))
                : canViewMemberships
                    ? membershipsToAssignableUsers(
                        await loadAllPages((page, pageSize) =>
                            departmentUsersService.getAll({ page, pageSize })
                        )
                    )
                    : user ? [authUserToAssignableUser(user)] : [];

            if (isBackgroundRefresh && dataGeneration !== dataGenerationRef.current) {
                return;
            }

            const visibleSubProjectIds = new Set(visibleSubProjects.map((item) => item.id));
            const visibleTasks = canAdminister
                ? loadedTasks
                : loadedTasks.filter((task) => visibleSubProjectIds.has(task.subProjectId));
            const visibleTaskIds = new Set(visibleTasks.map((task) => task.id));
            const visibleSubTasks = canAdminister
                ? loadedSubTasks
                : loadedSubTasks.filter((subTask) => visibleTaskIds.has(subTask.taskItemId));

            setTasks(visibleTasks);
            setSubTasks(visibleSubTasks);
            setSubProjects(visibleSubProjects);
            setUsers(loadedUsers);

            const selectionKey = `${requestedClientCompanyId}:${requestedProjectId}:${requestedSubProjectId}:${requestedTaskId}`;
            if (appliedSelectionKey.current !== selectionKey) {
                const requestedSubProject = visibleSubProjects.find(
                    (subProject) => subProject.id === requestedSubProjectId
                );
                const requestedClientExists = visibleSubProjects.some(
                    (subProject) =>
                        getClientFilterId(subProject.clientCompanyId) ===
                        requestedClientCompanyId
                );
                const initialClientCompanyId = requestedClientExists
                    ? requestedClientCompanyId
                    : requestedSubProject
                        ? getClientFilterId(
                            requestedSubProject.clientCompanyId
                        )
                        : "";
                const requestedProjectExists = visibleSubProjects.some(
                    (subProject) =>
                        subProject.projectId === requestedProjectId &&
                        getClientFilterId(subProject.clientCompanyId) ===
                        initialClientCompanyId
                );
                const initialProjectId = requestedProjectExists
                    ? requestedProjectId
                    : requestedSubProject &&
                    getClientFilterId(requestedSubProject.clientCompanyId) ===
                    initialClientCompanyId
                        ? requestedSubProject.projectId
                        : "";
                const initialSubProjectId = requestedSubProject?.projectId === initialProjectId &&
                    getClientFilterId(requestedSubProject.clientCompanyId) === initialClientCompanyId
                    ? requestedSubProject.id
                    : "";
                const requestedTaskExists = visibleTasks.some(
                    (task) =>
                        task.id === requestedTaskId &&
                        task.subProjectId === initialSubProjectId
                );
                const initialTaskId = requestedTaskExists ? requestedTaskId : "";

                setSelectedClientCompanyId(initialClientCompanyId);
                setSelectedProjectId(initialProjectId);
                setSelectedSubProjectId(initialSubProjectId);
                setSelectedTaskId(initialTaskId);
                appliedSelectionKey.current = selectionKey;
            }
        } catch (error) {
            if (!isBackgroundRefresh) {
                if (error instanceof ApiError) {
                    setError(error.message);
                } else {
                    setError("No se pudo cargar el tablero de subtareas.");
                }
            }
        } finally {
            if (!isBackgroundRefresh) {
                setIsLoading(false);
            }
        }
    }, [
        canAdminister,
        canAssignSubTasks,
        canViewMemberships,
        canViewUsers,
        requestedClientCompanyId,
        requestedProjectId,
        requestedSubProjectId,
        requestedTaskId,
        user
    ]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadData();
    }, [loadData]);

    useEffect(() => {
        const refreshBoard = () => {
            if (
                document.visibilityState !== "visible" ||
                activeSubTask ||
                newSubTask ||
                subTaskToEdit ||
                selectedSubTask ||
                isBackgroundRefreshing.current
            ) {
                return;
            }

            isBackgroundRefreshing.current = true;
            void loadData(true).finally(() => {
                isBackgroundRefreshing.current = false;
            });
        };
        const refreshInterval = window.setInterval(refreshBoard, 2_000);

        document.addEventListener("visibilitychange", refreshBoard);

        return () => {
            window.clearInterval(refreshInterval);
            document.removeEventListener("visibilitychange", refreshBoard);
        };
    }, [activeSubTask, loadData, newSubTask, selectedSubTask, subTaskToEdit]);

    const clients = useMemo(() => {
        const clientsById = new Map<string, string>();

        subProjects.forEach((subProject) => {
            clientsById.set(
                getClientFilterId(subProject.clientCompanyId),
                subProject.clientCompanyName ?? "Sin empresa cliente"
            );
        });

        return Array.from(clientsById, ([id, name]) => ({ id, name }));
    }, [subProjects]);
    const subProjectsForClient = useMemo(
        () => selectedClientCompanyId
            ? subProjects.filter(
                (subProject) =>
                    getClientFilterId(subProject.clientCompanyId) ===
                    selectedClientCompanyId
            )
            : subProjects,
        [selectedClientCompanyId, subProjects]
    );
    const projects = useMemo(() => {
        const projectsById = new Map<string, string>();

        subProjectsForClient.forEach((subProject) => {
            projectsById.set(subProject.projectId, subProject.projectTitle);
        });

        return Array.from(projectsById, ([id, title]) => ({ id, title }));
    }, [subProjectsForClient]);
    const subProjectsForProject = useMemo(
        () => selectedProjectId
            ? subProjectsForClient.filter(
                (subProject) => subProject.projectId === selectedProjectId
            )
            : subProjectsForClient,
        [selectedProjectId, subProjectsForClient]
    );
    const tasksForSubProject = useMemo(
        () => {
            const visibleSubProjectIds = new Set(
                subProjectsForProject.map((subProject) => subProject.id)
            );

            return tasks.filter((task) =>
                selectedSubProjectId
                    ? task.subProjectId === selectedSubProjectId
                    : visibleSubProjectIds.has(task.subProjectId)
            );
        },
        [selectedSubProjectId, subProjectsForProject, tasks]
    );
    const selectedSubProject = subProjects.find(
        (subProject) => subProject.id === selectedSubProjectId
    );
    const selectedTask =
        tasksForSubProject.find((task) => task.id === selectedTaskId) ?? null;
    const selectedTaskSubTasks = useMemo(
        () =>
            selectedTaskId
                ? subTasks.filter(
                    (subTask) => subTask.taskItemId === selectedTaskId
                )
                : subTasks.filter((subTask) =>
                    tasksForSubProject.some(
                        (task) => task.id === subTask.taskItemId
                    )
                ),
        [selectedTaskId, subTasks, tasksForSubProject]
    );
    const progressData = useMemo(() => {
        const completed = selectedTaskSubTasks.filter(
            (subTask) => subTask.status === "Completada"
        ).length;
        const percentage = selectedTaskSubTasks.length
            ? Math.round(completed * 100 / selectedTaskSubTasks.length)
            : 0;

        return {
            completed,
            total: selectedTaskSubTasks.length,
            percentage
        };
    }, [selectedTaskSubTasks]);
    const selectedTaskSchedule = selectedTask
        ? getTaskSchedule(selectedTask)
        : null;

    function handleClientChange(clientCompanyId: string) {
        setSelectedClientCompanyId(clientCompanyId);
        setSelectedProjectId("");
        setSelectedSubProjectId("");
        setSelectedTaskId("");
        updateSelectionUrl(clientCompanyId, "", "", "");
    }

    function handleProjectChange(projectId: string) {
        setSelectedProjectId(projectId);
        setSelectedSubProjectId("");
        setSelectedTaskId("");
        updateSelectionUrl(
            selectedClientCompanyId,
            projectId,
            "",
            ""
        );
    }

    function handleSubProjectChange(subProjectId: string) {
        setSelectedSubProjectId(subProjectId);
        setSelectedTaskId("");
        updateSelectionUrl(
            selectedClientCompanyId,
            selectedProjectId,
            subProjectId,
            ""
        );
    }

    function handleTaskSelection(taskId: string) {
        setSelectedTaskId(taskId);
        updateSelectionUrl(
            selectedClientCompanyId,
            selectedProjectId,
            selectedSubProjectId,
            taskId
        );
    }

    function updateSelectionUrl(
        clientCompanyId: string,
        projectId: string,
        subProjectId: string,
        taskId: string
    ) {
        const params = new URLSearchParams();
        if (clientCompanyId) {
            params.set("clientCompanyId", clientCompanyId);
        }

        if (projectId) {
            params.set("projectId", projectId);
        }

        if (subProjectId) {
            params.set("subProjectId", subProjectId);
        }

        if (taskId) {
            params.set("taskId", taskId);
        }

        window.history.replaceState(null, "", `/subtasks?${params.toString()}`);
    }

    function handleDragStart(event: DragStartEvent) {
        const draggedSubTask = event.active.data.current?.subTask as
            | SubTask
            | undefined;
        setActiveSubTask(draggedSubTask ?? null);
    }

    async function updateSubTaskStatus(
        subTask: SubTask,
        status: SubTaskStatus
    ) {
        if (subTask.status === status) {
            return;
        }

        statusUpdatesRef.current.add(subTask.id);
        dataGenerationRef.current += 1;
        const previousSubTasks = subTasks;
        setError(null);
        setSubTasks((current) =>
            current.map((item) =>
                item.id === subTask.id
                    ? {
                        ...item,
                        status,
                        isOverdue: calculateIsOverdue(item.endDate, status)
                    }
                    : item
            )
        );

        try {
            const updatedSubTask = await subTasksService.update(subTask.id, {
                title: subTask.title,
                detail: subTask.detail,
                startDate: subTask.startDate,
                endDate: subTask.endDate,
                status,
                taskItemId: subTask.taskItemId,
                assignedUserId: subTask.assignedUserId
            });
            setSubTasks((current) =>
                current.map((item) =>
                    item.id === updatedSubTask.id ? updatedSubTask : item
                )
            );

            try {
                const updatedTask = await tasksService.getById(
                    updatedSubTask.taskItemId
                );
                setTasks((current) =>
                    current.map((item) =>
                        item.id === updatedTask.id ? updatedTask : item
                    )
                );
            } catch {
                await loadData();
            }
        } catch (error) {
            setSubTasks(previousSubTasks);

            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudo cambiar el estado de la subtarea.");
            }
        } finally {
            statusUpdatesRef.current.delete(subTask.id);
        }
    }

    async function handleDragEnd(event: DragEndEvent) {
        setActiveSubTask(null);

        const draggedSubTask = event.active.data.current?.subTask as
            | SubTask
            | undefined;
        const destinationStatus = event.over?.id.toString() as
            | SubTaskStatus
            | undefined;

        if (!draggedSubTask || !destinationStatus) {
            return;
        }

        await updateSubTaskStatus(draggedSubTask, destinationStatus);
    }

    const handleCommentCountChange = useCallback((count: number) => {
        setSelectedSubTask((current) =>
            current ? { ...current, commentCount: count } : current
        );
        setSubTasks((current) =>
            current.map((subTask) =>
                subTask.id === selectedSubTask?.id
                    ? { ...subTask, commentCount: count }
                    : subTask
            )
        );
    }, [selectedSubTask?.id]);

    return (
        <RequireAuth allowedRoles={PROJECT_MANAGER_ROLES}>
            <AppShell>
                <header className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        {selectedTask && selectedSubProject ? (
                            <WorkHierarchyBreadcrumbs items={[
                                { type: "Cliente", label: selectedTask.clientCompanyName ?? "Sin empresa cliente", href: selectedTask.clientCompanyId ? `/client-companies/${selectedTask.clientCompanyId}` : undefined },
                                { type: "Proyecto", label: selectedTask.projectTitle, href: `/projects/${selectedTask.projectId}` },
                                { type: "Subproyecto", label: selectedSubProject.title, href: `/subprojects/${selectedSubProject.id}` },
                                { type: "Tarea", label: selectedTask.title }
                            ]} />
                        ) : <p className="text-sm font-medium text-gray-500">Subtareas</p>}
                        <h1 className="mt-3 truncate text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">{selectedTask?.title ?? "Subtareas"}</h1>
                        {selectedTask && selectedSubProject && <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600"><span>Subproyecto: <strong className="font-medium text-gray-800">{selectedSubProject.title}</strong></span><span className="text-gray-300">•</span><span>Proyecto: <strong className="font-medium text-gray-800">{selectedTask.projectTitle}</strong></span><span className="text-gray-300">•</span><span>Cliente: <strong className="font-medium text-gray-800">{selectedTask.clientCompanyName ?? "Sin empresa cliente"}</strong></span></p>}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {canCreateSubTasks && <button type="button" onClick={() => setNewSubTask({ taskId: selectedTask?.id, status: "Pendiente" })} className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"><Plus size={18} /><span className="hidden sm:inline">Nueva subtarea</span></button>}
                        <button
                            type="button"
                            title="Actualizar tablero"
                            aria-label="Actualizar tablero"
                            onClick={() => void loadData()}
                            disabled={isLoading}
                            className="rounded-md border border-gray-300 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={19}
                                className={isLoading ? "animate-spin" : ""}
                            />
                        </button>
                    </div>
                </header>

                {error && (
                    <div
                        role="alert"
                        className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                {selectedTask && (
                    <section className="mb-4 grid overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:grid-cols-[minmax(0,1.45fr)_auto_auto_auto]">
                        <div className="flex min-w-0 items-center gap-4 px-5 py-4">
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><FileText size={28} /></span>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-500">Progreso de la tarea</p>
                                <div className="mt-0.5 flex items-end justify-between gap-3"><strong className="text-2xl font-bold text-gray-950">{progressData.percentage}%</strong><span className="pb-0.5 text-xs text-gray-500">{progressData.completed} de {progressData.total} subtareas completadas</span></div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${progressData.percentage}%` }} /></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4 lg:border-l lg:border-t-0"><CheckCircle2 size={22} className="shrink-0 text-emerald-600" /><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">{selectedTask.status === "Completado" || selectedTask.status === "Completada" ? "Completada" : selectedTask.status}</span></div>
                        <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4 lg:border-l lg:border-t-0"><CalendarDays size={22} className="shrink-0 text-gray-500" /><div><p className="text-xs text-gray-500">Fecha límite</p><p className="mt-0.5 text-sm font-semibold text-gray-800">{selectedTask.endDate ? formatDateOnly(selectedTask.endDate) : "Sin fecha límite"}</p></div></div>
                        <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4 lg:border-l lg:border-t-0"><Building2 size={22} className="shrink-0 text-gray-500" /><div className="min-w-0"><p className="text-xs text-gray-500">Responsable</p><p className="mt-0.5 truncate text-sm font-semibold text-gray-800">{[selectedTask.assignedUserFirstName, selectedTask.assignedUserLastName].filter(Boolean).join(" ") || "Sin asignar"}</p></div></div>
                    </section>
                )}

                <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:px-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
                        <div>
                            <label
                                htmlFor="board-client"
                                className="mb-1.5 block text-xs font-semibold uppercase text-gray-500"
                            >
                                Cliente
                            </label>
                            <select
                                id="board-client"
                                value={selectedClientCompanyId}
                                onChange={(event) =>
                                    handleClientChange(event.target.value)
                                }
                                disabled={clients.length === 0}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                            >
                                {clients.length > 0 && (
                                    <option value="">Todos los clientes</option>
                                )}
                                {clients.length === 0 && (
                                    <option value="">Sin clientes</option>
                                )}
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="board-project"
                                className="mb-1.5 block text-xs font-semibold uppercase text-gray-500"
                            >
                                Proyecto
                            </label>
                            <select
                                id="board-project"
                                value={selectedProjectId}
                                onChange={(event) =>
                                    handleProjectChange(event.target.value)
                                }
                                disabled={projects.length === 0}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                            >
                                {projects.length > 0 && (
                                    <option value="">Todos los proyectos</option>
                                )}
                                {projects.length === 0 && (
                                    <option value="">Sin proyectos</option>
                                )}
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="board-subproject"
                                className="mb-1.5 block text-xs font-semibold uppercase text-gray-500"
                            >
                                Subproyecto
                            </label>
                            <select
                                id="board-subproject"
                                value={selectedSubProjectId}
                                onChange={(event) =>
                                    handleSubProjectChange(event.target.value)
                                }
                                disabled={subProjectsForProject.length === 0}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                            >
                                {subProjectsForProject.length > 0 && (
                                    <option value="">Todos los subproyectos</option>
                                )}
                                {subProjectsForProject.length === 0 && (
                                    <option value="">Sin subproyectos</option>
                                )}
                                {subProjectsForProject.map((subProject) => (
                                    <option
                                        key={subProject.id}
                                        value={subProject.id}
                                    >
                                        {subProject.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="board-task"
                                className="mb-1.5 block text-xs font-semibold uppercase text-gray-500"
                            >
                                Tarea
                            </label>
                            <select
                                id="board-task"
                                value={selectedTaskId}
                                onChange={(event) =>
                                    handleTaskSelection(event.target.value)
                                }
                                disabled={tasksForSubProject.length === 0}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                            >
                                {tasksForSubProject.length > 0 && (
                                    <option value="">Todas las tareas</option>
                                )}
                                {tasksForSubProject.length === 0 && (
                                    <option value="">Sin tareas</option>
                                )}
                                {tasksForSubProject.map((task) => (
                                    <option key={task.id} value={task.id}>
                                        {task.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedTask && (
                            <div className="hidden min-w-0">
                                <p className="mb-1 truncate text-[11px] font-semibold uppercase text-blue-700">
                                    {selectedSubProject?.clientCompanyName ?? "Sin empresa cliente"}
                                    <span className="px-1.5 text-gray-300">/</span>
                                    {selectedSubProject?.projectTitle}
                                    <span className="px-1.5 text-gray-300">/</span>
                                    {selectedSubProject?.title}
                                </p>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="truncate text-sm font-semibold text-gray-900">
                                        {selectedTask.title}
                                    </p>
                                    <span className="text-sm font-bold text-gray-900">
                                        {progressData.percentage}%
                                    </span>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                                    <div
                                        className="h-full bg-emerald-500 transition-[width] duration-300"
                                        style={{
                                            width: `${progressData.percentage}%`
                                        }}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    {progressData.completed} de {progressData.total} subtareas completadas
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                    <span className={`rounded px-2 py-1 font-semibold ${getTaskStatusClass(selectedTask.status)}`}>
                                        {selectedTask.status}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <CalendarDays size={14} />
                                        Creada {formatCreatedAt(selectedTask.createdAt)}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Clock3 size={14} />
                                        Límite {selectedTask.endDate
                                            ? formatDateOnly(selectedTask.endDate)
                                            : "Sin fecha"}
                                    </span>
                                    {selectedTaskSchedule && (
                                        <span className={`rounded px-2 py-1 font-semibold ${selectedTaskSchedule.className}`}>
                                            {selectedTaskSchedule.label}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </section>

                {!isLoading && selectedSubProject && (
                    <section className="hidden mb-4 border-y border-gray-200 bg-white px-4 py-4 sm:px-5">
                        <div className="mb-3 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">
                                    Tareas del subproyecto
                                </h2>
                                <p className="mt-1 text-xs text-gray-500">
                                    {selectedSubProject.title}
                                </p>
                            </div>
                            <span className="text-xs font-medium text-gray-500">
                                {tasksForSubProject.length} tareas
                            </span>
                        </div>

                        {tasksForSubProject.length === 0 ? (
                            <p className="rounded-md border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                                Este subproyecto todavía no tiene tareas.
                            </p>
                        ) : (
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {tasksForSubProject.map((task) => {
                                    const isSelected =
                                        task.id === selectedTask?.id;
                                    const taskProgress = isSelected
                                        ? progressData.percentage
                                        : task.progressPercentage;
                                    const taskSubTaskCount = isSelected
                                        ? progressData.total
                                        : task.subTaskCount;
                                    const taskSchedule = getTaskSchedule(task);

                                    return (
                                        <button
                                            key={task.id}
                                            type="button"
                                            aria-pressed={isSelected}
                                            onClick={() =>
                                                handleTaskSelection(task.id)
                                            }
                                            className={`flex min-h-44 flex-col border px-4 py-3 text-left transition ${
                                                isSelected
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {task.title}
                                                </span>
                                                <span className="shrink-0 text-xs font-bold text-gray-700">
                                                    {taskProgress}%
                                                </span>
                                            </div>
                                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
                                                <div
                                                    className="h-full bg-emerald-500"
                                                    style={{
                                                        width: `${taskProgress}%`
                                                    }}
                                                />
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500">
                                                {taskSubTaskCount} subtareas
                                            </p>
                                            <div className="mt-auto border-t border-gray-100 pt-3">
                                                <div className="grid gap-1.5 text-xs text-gray-500">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <CalendarDays size={13} />
                                                        Creada {formatCreatedAt(task.createdAt)}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Clock3 size={13} />
                                                        Límite {task.endDate
                                                            ? formatDateOnly(task.endDate)
                                                            : "Sin fecha"}
                                                    </span>
                                                </div>
                                                <span className={`mt-2 inline-flex rounded px-2 py-1 text-xs font-semibold ${taskSchedule.className}`}>
                                                    {taskSchedule.label}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold tracking-tight text-gray-950">Subtareas</h2>
                    {tasksForSubProject.length > 0 && <span className="text-sm text-gray-500">{progressData.total} registradas</span>}
                </div>

                {isLoading ? (
                    <div className="flex h-72 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
                        Cargando tablero...
                    </div>
                ) : tasksForSubProject.length === 0 ? (
                    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-sm text-gray-500">
                        No hay tareas para los filtros seleccionados.
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={boardCollisionDetection}
                        onDragStart={handleDragStart}
                        onDragCancel={() => setActiveSubTask(null)}
                        onDragEnd={(event) => void handleDragEnd(event)}
                    >
                        <div className="grid min-h-[calc(100vh-29rem)] gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {KANBAN_STATUSES.map((status) => (
                                <SubTaskStatusColumn
                                    key={status}
                                    status={status}
                                    subTasks={selectedTaskSubTasks.filter(
                                        (subTask) =>
                                            subTask.status === status ||
                                            (
                                                status === "Pendiente" &&
                                                subTask.status === "Pausada"
                                            )
                                    )}
                                    onOpenSubTask={setSelectedSubTask}
                                    onEditSubTask={setSubTaskToEdit}
                                    onToggleComplete={(subTask) =>
                                        void updateSubTaskStatus(
                                            subTask,
                                            subTask.status === "Completada"
                                                ? "Pendiente"
                                                : "Completada"
                                        )
                                    }
                                    onCreateSubTask={canCreateSubTasks ? (status) =>
                                        setNewSubTask({
                                            taskId: selectedTask?.id,
                                            status
                                        }) : undefined}
                                    canCreate={canCreateSubTasks}
                                />
                            ))}
                        </div>

                        <DragOverlay>
                            {activeSubTask && (
                                <div className="w-[270px] rotate-2 rounded-md border border-blue-200 bg-white p-3 shadow-xl">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2
                                                size={17}
                                                className="text-gray-400"
                                            />
                                            <p className="text-sm font-semibold text-gray-900">
                                                {activeSubTask.title}
                                            </p>
                                        </div>
                                        <GripVertical
                                            size={17}
                                            className="text-gray-400"
                                        />
                                    </div>
                                </div>
                            )}
                        </DragOverlay>
                    </DndContext>
                )}

                {newSubTask && (
                    <SubTaskFormModal
                        subTask={null}
                        initialTaskItemId={newSubTask.taskId}
                        initialStatus={newSubTask.status}
                        tasks={tasks}
                        users={getAssignableUsers(users)}
                        onClose={() => setNewSubTask(null)}
                        onSaved={loadData}
                    />
                )}

                {subTaskToEdit && (
                    <SubTaskFormModal
                        subTask={subTaskToEdit}
                        tasks={tasks}
                        users={getAssignableUsers(users)}
                        onClose={() => setSubTaskToEdit(null)}
                        onSaved={loadData}
                    />
                )}

                {selectedSubTask && (
                    <SubTaskCommentsModal
                        subTask={selectedSubTask}
                        onClose={() => setSelectedSubTask(null)}
                        onCommentCountChange={handleCommentCountChange}
                    />
                )}
            </AppShell>
        </RequireAuth>
    );
}
