"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    Suspense,
    useState
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    ArrowRight,
    BriefcaseBusiness,
    CalendarDays,
    CheckCircle2,
    Eye,
    Pencil,
    Plus,
    RefreshCw,
    Trash2
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PROJECT_MANAGER_ROLES } from "@/lib/roles";
import { isAdministrator } from "@/lib/roles";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { SubProjectDeleteDialog } from "@/components/subprojects/SubProjectDeleteDialog";
import { SubProjectFormModal } from "@/components/subprojects/SubProjectFormModal";
import { ApiError } from "@/services/api";
import { departmentsService } from "@/services/departments.service";
import { projectsService } from "@/services/projects.service";
import { subProjectsService } from "@/services/subprojects.service";
import { tasksService } from "@/services/tasks.service";
import { usersService } from "@/services/users.service";
import { loadAllPages } from "@/services/pagination";
import { Department } from "@/types/department.types";
import { Project } from "@/types/project.types";
import { SubProject } from "@/types/subproject.types";
import { TaskItem } from "@/types/task.types";
import { User } from "@/types/user.types";

function formatDate(value: string | null): string {
    if (!value) {
        return "Sin fecha";
    }

    const [year, month, day] = value.split("-").map(Number);

    return new Intl.DateTimeFormat("es-BO").format(
        new Date(year, month - 1, day)
    );
}

function getStatusClass(status: string): string {
    switch (status) {
        case "Completado":
            return "bg-emerald-50 text-emerald-700";
        case "En curso":
        case "En proceso":
            return "bg-blue-50 text-blue-700";
        case "Retrasado":
            return "bg-red-50 text-red-700";
        default:
            return "bg-amber-50 text-amber-700";
    }
}

function getSubProjectSchedule(startDate: string, endDate: string | null): {
    label: string;
    className: string;
} {
    const today = new Date().toISOString().slice(0, 10);

    if (startDate > today) {
        return { label: "Aún no inicia", className: "text-gray-500" };
    }

    if (!endDate) {
        return { label: "En curso", className: "text-gray-500" };
    }

    const days = Math.round(
        (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
    );

    if (days < 0) {
        const overdueDays = Math.abs(days);
        return {
            label: `${overdueDays} ${overdueDays === 1 ? "día" : "días"} de atraso`,
            className: "text-red-600"
        };
    }

    if (days === 0) {
        return { label: "Vence hoy", className: "text-amber-700" };
    }

    return {
        label: `${days} ${days === 1 ? "día restante" : "días restantes"}`,
        className: "text-amber-700"
    };
}

export default function SubProjectsPage() {
    return (
        <Suspense
            fallback={
                <div className="p-6 text-sm text-gray-500">
                    Cargando subproyectos...
                </div>
            }
        >
            <SubProjectsContent />
        </Suspense>
    );
}

function SubProjectsContent() {
    const { user } = useAuth();
    const canAdminister = isAdministrator(user?.roleName);
    const searchParams = useSearchParams();
    const projectId = searchParams.get("projectId") ?? "";
    const [subProjects, setSubProjects] = useState<SubProject[]>([]);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedSubProject, setSelectedSubProject] =
        useState<SubProject | null>(null);
    const [selectedClientCompanyId, setSelectedClientCompanyId] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState(projectId);
    const [subProjectToDelete, setSubProjectToDelete] =
        useState<SubProject | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [
                visibleSubProjects,
                loadedProjects,
                loadedDepartments,
                loadedUsers,
                loadedTasks
            ] = await Promise.all([
                loadAllPages((page, pageSize) => subProjectsService.getAll({
                    page,
                    pageSize,
                    projectId: projectId || undefined
                })),
                loadAllPages((page, pageSize) => projectsService.getAll({ page, pageSize })),
                canAdminister ? loadAllPages((page, pageSize) => departmentsService.getAll({ page, pageSize })) : Promise.resolve([] as Department[]),
                canAdminister ? loadAllPages((page, pageSize) => usersService.getAll({ page, pageSize })) : Promise.resolve([] as User[]),
                loadAllPages((page, pageSize) => tasksService.getAll({ page, pageSize }))
            ]);

            const visibleSubProjectIds = new Set(visibleSubProjects.map((item) => item.id));

            setSubProjects(visibleSubProjects);
            setProjects(loadedProjects);
            setDepartments(canAdminister ? loadedDepartments : Array.from(new Map(visibleSubProjects.map((item) => [item.departmentId, { id: item.departmentId, name: item.departmentName, description: null }])).values()));
            setUsers(loadedUsers);
            setTasks(loadedTasks.filter((task) => visibleSubProjectIds.has(task.subProjectId)));
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudieron cargar los subproyectos.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [canAdminister, projectId]);

    const filteredProject = projects.find(
        (project) => project.id === projectId
    );
    const clientOptions = useMemo(() => Array.from(
        new Map(
            projects
                .filter((project) => project.clientCompanyId && project.clientCompanyName)
                .map((project) => [project.clientCompanyId!, project.clientCompanyName!])
        )
    ).map(([id, name]) => ({ id, name })), [projects]);
    const availableProjects = useMemo(
        () => projects.filter((project) => !selectedClientCompanyId || project.clientCompanyId === selectedClientCompanyId),
        [projects, selectedClientCompanyId]
    );
    const visibleSubProjects = useMemo(
        () => subProjects.filter((subProject) =>
            (!selectedClientCompanyId || subProject.clientCompanyId === selectedClientCompanyId) &&
            (!selectedProjectId || subProject.projectId === selectedProjectId)
        ),
        [selectedClientCompanyId, selectedProjectId, subProjects]
    );
    const completedTaskCountBySubProject = useMemo(() => {
        const values = new Map<string, { total: number; completed: number }>();

        tasks.forEach((task) => {
            const current = values.get(task.subProjectId) ?? { total: 0, completed: 0 };
            current.total += 1;
            if (task.status === "Completado" || task.status === "Completada") current.completed += 1;
            values.set(task.subProjectId, current);
        });

        return values;
    }, [tasks]);
    const projectProgress = useMemo(() => {
        const projectTasks = tasks.filter((task) => task.projectId === projectId);
        const completed = projectTasks.filter(
            (task) => task.status === "Completado" || task.status === "Completada"
        ).length;

        return {
            total: projectTasks.length,
            completed,
            percentage: projectTasks.length ? Math.round(completed * 100 / projectTasks.length) : null
        };
    }, [projectId, tasks]);

    function getEffectiveStatus(subProject: SubProject): string {
        const taskSummary = completedTaskCountBySubProject.get(subProject.id);
        if (taskSummary && taskSummary.total > 0 && taskSummary.completed === taskSummary.total) {
            return "Completado";
        }

        return taskSummary && taskSummary.completed > 0 ? "En proceso" : subProject.status;
    }

    useEffect(() => {
        // Carga inicial de subproyectos y catálogos relacionados.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadData();
    }, [loadData]);

    return (
        <RequireAuth allowedRoles={PROJECT_MANAGER_ROLES}>
            <AppShell>
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        {filteredProject ? (
                            <Link
                                href="/projects"
                                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                <ArrowLeft size={16} />
                                Proyectos
                            </Link>
                        ) : (
                            <p className="text-sm font-medium text-blue-600">
                                Operaciones
                            </p>
                        )}

                        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                            {filteredProject
                                ? `Subproyectos de ${filteredProject.title}`
                                : "Subproyectos"}
                        </h1>

                        <p className="mt-2 text-sm text-gray-600">
                            Etapas de trabajo asociadas a cada proyecto.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedSubProject(null);
                                setIsFormOpen(true);
                            }}
                            disabled={
                                isLoading ||
                                projects.length === 0 ||
                                departments.length === 0
                            }
                            className="flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Plus size={18} />
                            Nuevo subproyecto
                        </button>

                        <button
                            type="button"
                            title="Actualizar subproyectos"
                            aria-label="Actualizar subproyectos"
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
                        className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                <section className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <label className="min-w-56 flex-1 text-sm font-semibold text-gray-800">
                        Cliente
                        <select
                            value={selectedClientCompanyId}
                            onChange={(event) => {
                                const nextClientCompanyId = event.target.value;
                                setSelectedClientCompanyId(nextClientCompanyId);
                                if (selectedProjectId && !projects.some((project) => project.id === selectedProjectId && (!nextClientCompanyId || project.clientCompanyId === nextClientCompanyId))) {
                                    setSelectedProjectId("");
                                }
                            }}
                            className="mt-1.5 block h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900"
                        >
                            <option value="">Todos los clientes</option>
                            {clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                        </select>
                    </label>
                    <label className="min-w-56 flex-1 text-sm font-semibold text-gray-800">
                        Proyecto
                        <select
                            value={selectedProjectId}
                            onChange={(event) => setSelectedProjectId(event.target.value)}
                            className="mt-1.5 block h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900"
                        >
                            <option value="">Todos los proyectos</option>
                            {availableProjects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                        </select>
                    </label>
                </section>

                {filteredProject && (
                    <section className="mb-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="grid divide-y divide-gray-100 lg:grid-cols-[1.2fr_.8fr_1fr] lg:divide-x lg:divide-y-0">
                            <div className="flex items-center gap-3 px-5 py-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><BriefcaseBusiness size={20} /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Proyecto</p><p className="mt-1 truncate text-sm font-semibold text-gray-950">{filteredProject.title}</p><p className="mt-1 truncate text-xs text-gray-500">Cliente: {filteredProject.clientCompanyName ?? "Sin empresa cliente"}</p></div></div>
                            <div className="flex items-center gap-3 px-5 py-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><CheckCircle2 size={20} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Subproyectos</p><p className="mt-1 text-sm font-semibold text-gray-950">{subProjects.length} {subProjects.length === 1 ? "registrado" : "registrados"}</p></div></div>
                            <div className="px-5 py-4"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Avance general</p><strong className="text-lg text-blue-700">{projectProgress.percentage === null ? "—" : `${projectProgress.percentage}%`}</strong></div>{projectProgress.percentage === null ? <p className="mt-2 text-xs text-gray-500">Sin tareas para calcular avance.</p> : <><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${projectProgress.percentage}%` }} /></div><p className="mt-2 text-xs text-gray-500">{projectProgress.completed} de {projectProgress.total} tareas completadas</p></>}</div>
                        </div>
                    </section>
                )}

                <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1300px] border-collapse text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Subproyecto
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Proyecto
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Departamento
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Responsable
                                    </th>
                                    <th className="min-w-48 px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Periodo
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Tareas
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Avance
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Estado
                                    </th>
                                    <th className="sticky right-0 z-20 w-36 border-l border-gray-200 bg-gray-50 px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500 shadow-[-4px_0_8px_-6px_rgba(15,23,42,0.35)]">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            Cargando subproyectos...
                                        </td>
                                    </tr>
                                ) : visibleSubProjects.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            {filteredProject
                                                ? "Este proyecto todavía no tiene subproyectos."
                                                : "No existen subproyectos registrados."}
                                        </td>
                                    </tr>
                                ) : (
                                    visibleSubProjects.map((subProject) => {
                                        const effectiveStatus = getEffectiveStatus(subProject);
                                        const taskSummary = completedTaskCountBySubProject.get(subProject.id) ?? { total: 0, completed: 0 };
                                        const progress = taskSummary.total > 0 ? Math.round(taskSummary.completed * 100 / taskSummary.total) : null;
                                        const schedule = getSubProjectSchedule(subProject.startDate, subProject.endDate);
                                        const assignedUserName = [
                                            subProject.assignedUserFirstName,
                                            subProject.assignedUserLastName
                                        ].filter(Boolean).join(" ");

                                        return (
                                            <tr
                                                key={subProject.id}
                                                className="transition hover:bg-gray-50"
                                            >
                                                <td className="max-w-xs px-5 py-4">
                                                    <Link
                                                        href={`/tasks?projectId=${subProject.projectId}&subProjectId=${subProject.id}`}
                                                        className="group flex items-start gap-2 text-sm font-semibold text-gray-900 hover:text-blue-700"
                                                    >
                                                        <span>{subProject.title}</span>
                                                        <ArrowRight
                                                            size={15}
                                                            className="mt-0.5 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                                                        />
                                                    </Link>
                                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                                                        {subProject.detail ||
                                                            "Sin detalle"}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-700">
                                                    <p className="font-medium text-gray-800">
                                                        {subProject.projectTitle}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {subProject.clientCompanyName ||
                                                            "Sin empresa cliente"}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-700">
                                                    {subProject.departmentName}
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    {assignedUserName ||
                                                        "Sin responsable"}
                                                </td>

                                                <td className="min-w-48 px-5 py-4 text-sm text-gray-700">
                                                    <div className="flex items-start gap-2">
                                                        <CalendarDays size={15} className="mt-0.5 shrink-0 text-gray-500" />
                                                        <div>
                                                            <p className="whitespace-nowrap font-medium">{formatDate(subProject.startDate)} - {formatDate(subProject.endDate)}</p>
                                                            <p className={`mt-1 text-xs font-medium ${schedule.className}`}>{schedule.label}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-700"><p className="font-semibold">{taskSummary.total === 0 ? "—" : `${taskSummary.completed} / ${taskSummary.total}`}</p><p className="mt-1 text-xs text-gray-500">{taskSummary.total === 1 ? "tarea completada" : "tareas completadas"}</p></td>

                                                <td className="min-w-36 px-5 py-4">{progress === null ? <span className="text-sm text-gray-500">Sin tareas</span> : <div><div className="mb-2 flex justify-between text-xs text-gray-500"><span>Avance</span><strong className="text-gray-800">{progress}%</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${progress === 100 ? "bg-emerald-600" : "bg-blue-600"}`} style={{ width: `${progress}%` }} /></div></div>}</td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(effectiveStatus)}`}
                                                    >
                                                        {effectiveStatus}
                                                    </span>
                                                </td>

                                                <td className="sticky right-0 z-10 border-l border-gray-100 bg-white px-5 py-4 text-right shadow-[-4px_0_8px_-6px_rgba(15,23,42,0.25)]">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link href={`/tasks?projectId=${subProject.projectId}&subProjectId=${subProject.id}`} title="Ver tareas" aria-label={`Ver tareas de ${subProject.title}`} className="rounded-md p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-700"><Eye size={18} /></Link>
                                                        <button
                                                            type="button"
                                                            title="Editar subproyecto"
                                                            aria-label={`Editar ${subProject.title}`}
                                                            onClick={() => {
                                                                setSelectedSubProject(
                                                                    subProject
                                                                );
                                                                setIsFormOpen(
                                                                    true
                                                                );
                                                            }}
                                                            className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            title="Eliminar subproyecto"
                                                            aria-label={`Eliminar ${subProject.title}`}
                                                            onClick={() =>
                                                                setSubProjectToDelete(
                                                                    subProject
                                                                )
                                                            }
                                                            className="rounded-md p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {isFormOpen && (
                    <SubProjectFormModal
                        subProject={selectedSubProject}
                        projects={projects}
                        departments={departments}
                        users={users}
                        onClose={() => {
                            setIsFormOpen(false);
                            setSelectedSubProject(null);
                        }}
                        onSaved={loadData}
                    />
                )}

                {subProjectToDelete && (
                    <SubProjectDeleteDialog
                        subProject={subProjectToDelete}
                        onClose={() => setSubProjectToDelete(null)}
                        onDeleted={loadData}
                    />
                )}
            </AppShell>
        </RequireAuth>
    );
}
