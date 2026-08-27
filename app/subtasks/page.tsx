"use client";

import {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import Link from "next/link";
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
    CalendarDays,
    CheckCircle2,
    ArrowLeft,
    Clock3,
    GripVertical,
    RefreshCw
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { SubTaskCommentsModal } from "@/components/subtasks/SubTaskCommentsModal";
import { SubTaskFormModal } from "@/components/subtasks/SubTaskFormModal";
import { SubTaskStatusColumn } from "@/components/tasks/SubTaskStatusColumn";
import { ApiError } from "@/services/api";
import { subProjectsService } from "@/services/subprojects.service";
import { subTasksService } from "@/services/subtasks.service";
import { tasksService } from "@/services/tasks.service";
import { usersService } from "@/services/users.service";
import { getAssignableUsers } from "@/lib/assignment";
import { SubProject } from "@/types/subproject.types";
import {
    SUBTASK_STATUSES,
    SubTask,
    SubTaskStatus
} from "@/types/subtask.types";
import { TaskItem } from "@/types/task.types";
import { User } from "@/types/user.types";

interface NewSubTaskState {
    taskId: string;
    status: SubTaskStatus;
}

const boardCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);

    return pointerCollisions.length > 0
        ? pointerCollisions
        : rectIntersection(args);
};

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
    const searchParams = useSearchParams();
    const requestedSubProjectId =
        searchParams.get("subProjectId") ?? "";
    const requestedTaskId = searchParams.get("taskId") ?? "";
    const selectionInitialized = useRef(false);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [subTasks, setSubTasks] = useState<SubTask[]>([]);
    const [subProjects, setSubProjects] = useState<SubProject[]>([]);
    const [users, setUsers] = useState<User[]>([]);
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

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [
                tasksResult,
                subTasksResult,
                subProjectsResult,
                usersResult
            ] = await Promise.all([
                tasksService.getAll({ page: 1, pageSize: 100 }),
                subTasksService.getAll({ page: 1, pageSize: 100 }),
                subProjectsService.getAll({ page: 1, pageSize: 100 }),
                usersService.getAll({ page: 1, pageSize: 100 })
            ]);

            setTasks(tasksResult.items);
            setSubTasks(subTasksResult.items);
            setSubProjects(subProjectsResult.items);
            setUsers(usersResult.items);

            if (!selectionInitialized.current) {
                const requestedSubProjectExists =
                    subProjectsResult.items.some(
                        (subProject) =>
                            subProject.id === requestedSubProjectId
                    );
                const initialSubProjectId = requestedSubProjectExists
                    ? requestedSubProjectId
                    : tasksResult.items[0]?.subProjectId ??
                        subProjectsResult.items[0]?.id ??
                        "";
                const requestedTaskExists = tasksResult.items.some(
                    (task) =>
                        task.id === requestedTaskId &&
                        task.subProjectId === initialSubProjectId
                );
                const initialTaskId = requestedTaskExists
                    ? requestedTaskId
                    : tasksResult.items.find(
                        (task) =>
                            task.subProjectId === initialSubProjectId
                    )?.id ?? "";

                setSelectedSubProjectId(initialSubProjectId);
                setSelectedTaskId(initialTaskId);
                selectionInitialized.current = true;
            }
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudo cargar el tablero de subtareas.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [requestedSubProjectId, requestedTaskId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadData();
    }, [loadData]);

    const tasksForSubProject = useMemo(
        () =>
            tasks.filter(
                (task) => task.subProjectId === selectedSubProjectId
            ),
        [tasks, selectedSubProjectId]
    );
    const selectedSubProject = subProjects.find(
        (subProject) => subProject.id === selectedSubProjectId
    );
    const selectedTask =
        tasksForSubProject.find((task) => task.id === selectedTaskId) ??
        tasksForSubProject[0] ??
        null;
    const selectedTaskSubTasks = useMemo(
        () =>
            selectedTask
                ? subTasks.filter(
                    (subTask) => subTask.taskItemId === selectedTask.id
                )
                : [],
        [selectedTask, subTasks]
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

    function handleSubProjectChange(subProjectId: string) {
        setSelectedSubProjectId(subProjectId);
        const firstTask = tasks.find(
            (task) => task.subProjectId === subProjectId
        );
        const taskId = firstTask?.id ?? "";
        setSelectedTaskId(taskId);
        updateSelectionUrl(subProjectId, taskId);
    }

    function handleTaskSelection(taskId: string) {
        setSelectedTaskId(taskId);
        updateSelectionUrl(selectedSubProjectId, taskId);
    }

    function updateSelectionUrl(subProjectId: string, taskId: string) {
        const params = new URLSearchParams();
        params.set("subProjectId", subProjectId);

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
        <RequireAuth>
            <AppShell>
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        {selectedSubProject ? (
                            <Link
                                href={`/tasks?projectId=${selectedSubProject.projectId}&subProjectId=${selectedSubProject.id}`}
                                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                <ArrowLeft size={16} />
                                Tareas
                            </Link>
                        ) : (
                            <p className="text-sm font-medium text-blue-600">
                                Operaciones
                            </p>
                        )}
                        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                            Tablero de subtareas
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Seguimiento del trabajo por tarea y estado.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
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
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                <section className="mb-4 border-y border-gray-200 bg-white px-4 py-4 sm:px-5">
                    <div className="grid gap-4 lg:grid-cols-[220px_220px_1fr_auto] lg:items-end">
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
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                {subProjects.map((subProject) => (
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
                                value={selectedTask?.id ?? ""}
                                onChange={(event) =>
                                    handleTaskSelection(event.target.value)
                                }
                                disabled={tasksForSubProject.length === 0}
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                            >
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
                            <div className="min-w-0">
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
                    <section className="mb-4 border-y border-gray-200 bg-white px-4 py-4 sm:px-5">
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

                {isLoading ? (
                    <div className="flex h-72 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
                        Cargando tablero...
                    </div>
                ) : !selectedTask ? (
                    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-sm text-gray-500">
                        El subproyecto seleccionado todavía no tiene tareas.
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={boardCollisionDetection}
                        onDragStart={handleDragStart}
                        onDragCancel={() => setActiveSubTask(null)}
                        onDragEnd={(event) => void handleDragEnd(event)}
                    >
                        <div className="flex gap-4 overflow-x-auto pb-4">
                            {SUBTASK_STATUSES.map((status) => (
                                <SubTaskStatusColumn
                                    key={status}
                                    status={status}
                                    subTasks={selectedTaskSubTasks.filter(
                                        (subTask) => subTask.status === status
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
                                    onCreateSubTask={(status) =>
                                        setNewSubTask({
                                            taskId: selectedTask.id,
                                            status
                                        })
                                    }
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
