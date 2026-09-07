"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
    DndContext,
    DragEndEvent,
    useDraggable,
    useDroppable
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CircleAlert, ClipboardList, Columns3, List, MessageSquare, Plus, RefreshCw, Search } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { SubTaskCommentsModal } from "@/components/subtasks/SubTaskCommentsModal";
import { SubTaskFormModal } from "@/components/subtasks/SubTaskFormModal";
import { SubTaskStatusColumn } from "@/components/tasks/SubTaskStatusColumn";
import { TaskKanbanColumn } from "@/components/tasks/TaskKanbanColumn";
import { TaskListView } from "@/components/tasks/TaskListView";
import { useAuth } from "@/context/AuthContext";
import { WORKER_ROLES } from "@/lib/roles";
import { ApiError } from "@/services/api";
import { subTasksService } from "@/services/subtasks.service";
import { tasksService } from "@/services/tasks.service";
import { loadAllPages } from "@/services/pagination";
import { SubTask, SubTaskStatus } from "@/types/subtask.types";
import { TaskItem } from "@/types/task.types";

type WorkerStatus = "Pendiente" | "En proceso" | "En revisión" | "Completada";
type WorkItem = { id: string; kind: "task" | "subtask"; title: string; detail: string | null; status: WorkerStatus; endDate: string | null; projectId: string | null; project: string | null; subProject: string | null; parentTask: string | null; progress: number | null; source: TaskItem | SubTask };
const columns: WorkerStatus[] = ["Pendiente", "En proceso", "En revisión", "Completada"];

function normaliseStatus(status: string): WorkerStatus {
    if (status === "En curso" || status === "En proceso") return "En proceso";
    if (status === "Completado" || status === "Completada") return "Completada";
    if (status === "En revisión") return "En revisión";
    return "Pendiente";
}
function dateLabel(value: string | null): string { if (!value) return "Sin fecha límite"; return new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }
function isOverdue(item: WorkItem): boolean { return Boolean(item.endDate && item.endDate < new Date().toISOString().slice(0, 10) && item.status !== "Completada"); }

export default function MyWorkPage() {
    const { user } = useAuth();
    const pathname = usePathname();
    const mode = pathname.endsWith("/subtasks") ? "subtasks" : "tasks";
    const [contextTaskId] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("taskId") || "");
    const [today] = useState(() => new Date().toISOString().slice(0, 10));
    const [weekAhead] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 7); return date.toISOString().slice(0, 10); });
    const [tasks, setTasks] = useState<TaskItem[]>([]); const [subTasks, setSubTasks] = useState<SubTask[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [statusFilter, setStatusFilter] = useState("all"); const [projectFilter, setProjectFilter] = useState("all"); const [dateFilter, setDateFilter] = useState(typeof window === "undefined" ? "all" : new URLSearchParams(window.location.search).get("view") || "all"); const [search, setSearch] = useState(""); const [view, setView] = useState<"board" | "list">("board"); const [selected, setSelected] = useState<WorkItem | null>(null); const [commentSubTask, setCommentSubTask] = useState<SubTask | null>(null); const [newSubTaskStatus, setNewSubTaskStatus] = useState<SubTaskStatus | null>(null); const [updating, setUpdating] = useState<string | null>(null);
    const statusUpdatesRef = useRef(new Set<string>());
    const syncGenerationRef = useRef(0);
    const load = useCallback(async () => { if (!user) return; setLoading(true); setError(null); try { if (mode === "tasks") { const loadedTasks = await loadAllPages((page, pageSize) => tasksService.getAll({ page, pageSize })); setTasks(loadedTasks); setSubTasks([]); } else { const [loadedTasks, loadedSubTasks] = await Promise.all([loadAllPages((page, pageSize) => tasksService.getAll({ page, pageSize })), loadAllPages((page, pageSize) => subTasksService.getAll({ page, pageSize, taskItemId: contextTaskId || undefined }))]); setTasks(loadedTasks); setSubTasks(loadedSubTasks); } } catch (cause) { setError(cause instanceof ApiError ? cause.message : "No se pudo cargar tu trabajo."); } finally { setLoading(false); } }, [contextTaskId, mode, user]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); }, [load]);
    const syncWork = useCallback(async () => {
        if (!user || statusUpdatesRef.current.size > 0) return;

        const syncGeneration = syncGenerationRef.current;

        try {
            if (mode === "tasks") {
                const loadedTasks = await loadAllPages((page, pageSize) => tasksService.getAll({ page, pageSize }));
                if (syncGeneration !== syncGenerationRef.current) return;
                setTasks(loadedTasks);
                setSubTasks([]);
                return;
            }

            const [loadedTasks, loadedSubTasks] = await Promise.all([
                loadAllPages((page, pageSize) => tasksService.getAll({ page, pageSize })),
                loadAllPages((page, pageSize) => subTasksService.getAll({ page, pageSize, taskItemId: contextTaskId || undefined }))
            ]);
            if (syncGeneration !== syncGenerationRef.current) return;
            setTasks(loadedTasks);
            setSubTasks(loadedSubTasks);
        } catch {
            // Una actualizaciÃ³n remota no debe ocultar el trabajo actual por un error temporal.
        }
    }, [contextTaskId, mode, user]);
    useEffect(() => {
        let isRefreshing = false;
        const refreshWork = () => {
            if (
                document.visibilityState !== "visible" ||
                selected ||
                commentSubTask ||
                newSubTaskStatus ||
                isRefreshing
            ) {
                return;
            }

            isRefreshing = true;
            void syncWork().finally(() => {
                isRefreshing = false;
            });
        };
        const refreshInterval = window.setInterval(refreshWork, 2_000);

        document.addEventListener("visibilitychange", refreshWork);

        return () => {
            window.clearInterval(refreshInterval);
            document.removeEventListener("visibilitychange", refreshWork);
        };
    }, [commentSubTask, newSubTaskStatus, selected, syncWork]);
    useEffect(() => {
        if (selected?.kind !== "subtask") return;
        // En la vista operativa una subtarea se abre directamente en su conversación,
        // igual que en el tablero de Gerencia.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCommentSubTask(selected.source as SubTask);
        setSelected(null);
    }, [selected]);
    const items = useMemo<WorkItem[]>(() => {
        const taskContexts = new Map(tasks.map((task) => [task.id, task]));

        return [
            ...tasks.map((task) => ({ id: task.id, kind: "task" as const, title: task.title, detail: task.detail, status: normaliseStatus(task.status), endDate: task.endDate, projectId: task.projectId, project: task.projectTitle, subProject: task.subProjectTitle, parentTask: null, progress: task.progressPercentage, source: task })),
            ...subTasks.map((subTask) => {
                const parentTask = taskContexts.get(subTask.taskItemId);

                return { id: subTask.id, kind: "subtask" as const, title: subTask.title, detail: subTask.detail, status: normaliseStatus(subTask.status), endDate: subTask.endDate, projectId: parentTask?.projectId ?? null, project: parentTask?.projectTitle ?? null, subProject: parentTask?.subProjectTitle ?? null, parentTask: subTask.taskItemTitle, progress: null, source: subTask };
            })
        ];
    }, [subTasks, tasks]);
    const activeItems = useMemo(() => items.filter((item) => item.kind === (mode === "tasks" ? "task" : "subtask")), [items, mode]);
    const projects = useMemo(() => Array.from(new Set(activeItems.map((item) => item.project).filter((project): project is string => Boolean(project)))), [activeItems]);
    const filtered = useMemo(() => activeItems.filter((item) => { const matchesStatus = statusFilter === "all" || item.status === statusFilter; const matchesProject = projectFilter === "all" || item.project === projectFilter; const term = search.trim().toLowerCase(); const matchesSearch = !term || [item.title, item.project, item.subProject, item.parentTask].filter(Boolean).some((value) => value!.toLowerCase().includes(term)); const matchesDate = dateFilter === "completed" ? item.status === "Completada" : dateFilter === "due" ? Boolean(item.endDate && item.endDate >= today && item.endDate <= weekAhead) : dateFilter === "overdue" ? isOverdue(item) : true; return matchesStatus && matchesProject && matchesSearch && matchesDate; }), [activeItems, dateFilter, projectFilter, search, statusFilter, today, weekAhead]);
    const kpis = useMemo(() => columns.map((status) => ({ status, count: activeItems.filter((item) => item.status === status).length })), [activeItems]);
    const overdueCount = activeItems.filter(isOverdue).length;
    async function changeStatus(item: WorkItem, next: WorkerStatus) { if (!user || item.kind !== "subtask" || item.status === next || updating === item.id) return; statusUpdatesRef.current.add(item.id); syncGenerationRef.current += 1; setUpdating(item.id); setError(null); const previous = item.source as SubTask; setSubTasks((current) => current.map((subTask) => subTask.id === item.id ? { ...subTask, status: next, isOverdue: false } : subTask)); try { const updated = await subTasksService.updateStatus(item.id, next); setSubTasks((current) => current.map((subTask) => subTask.id === item.id ? updated : subTask)); setSelected(null); } catch (cause) { setSubTasks((current) => current.map((subTask) => subTask.id === item.id ? previous : subTask)); setError(cause instanceof ApiError ? cause.message : "No se pudo actualizar el estado."); } finally { statusUpdatesRef.current.delete(item.id); setUpdating(null); } }
    return <RequireAuth allowedRoles={WORKER_ROLES}><AppShell><div className="space-y-6"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-blue-700">Mi trabajo</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Hola, {user?.firstName}</h1><p className="mt-2 text-sm text-gray-600">Este es tu trabajo asignado. Aquí puedes ver y gestionar tus tareas y subtareas.</p></div><div className="flex items-center gap-2">{mode === "subtasks" && tasks.length > 0 && <button type="button" onClick={() => setNewSubTaskStatus("Pendiente")} className="inline-flex h-10 items-center gap-2 rounded-md bg-gray-900 px-3 text-sm font-semibold text-white hover:bg-gray-700"><Plus size={16} />Nueva subtarea</button>}<button onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Actualizar</button></div></header>{error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<section className="grid overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-5">{kpis.map(({ status, count }) => <Kpi key={status} status={status} count={count} />)}<div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4 sm:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0"><span className="flex size-9 items-center justify-center rounded-lg bg-red-50 text-red-700"><CircleAlert size={18} /></span><div><p className="text-2xl font-semibold text-gray-950">{overdueCount}</p><p className="text-xs font-medium text-gray-500">Atrasadas</p></div></div></section><section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="grid gap-3 sm:grid-cols-3 xl:w-[55%]"><Select value={statusFilter} onChange={setStatusFilter} options={[["all", "Todos los estados"], ...columns.map((status) => [status, status])]} /><Select value={projectFilter} onChange={setProjectFilter} options={[["all", "Todos los proyectos"], ...projects.map((project) => [project, project])]} /><Select value={dateFilter} onChange={setDateFilter} options={[["all", "Todas las fechas"], ["due", "Próximos 7 días"], ["overdue", "Atrasadas"], ["completed", "Completadas"]]} /></div><label className="relative block flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en mi trabajo..." className="h-11 w-full rounded-md border border-gray-300 pl-10 pr-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label><div className="inline-flex rounded-md border border-gray-300 p-1"><ViewButton active={view === "board"} onClick={() => setView("board")} label="Tablero" icon={Columns3} /><ViewButton active={view === "list"} onClick={() => setView("list")} label="Lista" icon={List} /></div></div></section>{view === "board" ? <WorkBoard items={filtered} onOpen={setSelected} onMove={changeStatus} onCreateSubTask={mode === "subtasks" ? setNewSubTaskStatus : undefined} onInvalidMove={setError} /> : <WorkList items={filtered} onOpen={setSelected} />}</div>{selected && <WorkDetail item={selected} userId={user!.id} updating={updating === selected.id} onClose={() => setSelected(null)} onStatus={changeStatus} onComments={(subTask) => setCommentSubTask(subTask)} />}{commentSubTask && <SubTaskCommentsModal subTask={commentSubTask} onClose={() => setCommentSubTask(null)} />}{newSubTaskStatus && <SubTaskFormModal subTask={null} initialTaskItemId={tasks.some((task) => task.id === contextTaskId) ? contextTaskId : tasks.length === 1 ? tasks[0].id : undefined} initialStatus={newSubTaskStatus} tasks={tasks} users={[]} hideAssignee assigneeLabel={user ? `${user.firstName} ${user.lastName} (tú)` : undefined} onClose={() => setNewSubTaskStatus(null)} onSaved={load} />}</AppShell></RequireAuth>;
}

function Kpi({ status, count }: { status: WorkerStatus; count: number }) { const tones: Record<WorkerStatus, string> = { Pendiente: "bg-slate-50 text-slate-700", "En proceso": "bg-blue-50 text-blue-700", "En revisión": "bg-violet-50 text-violet-700", Completada: "bg-emerald-50 text-emerald-700" }; return <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 sm:border-r xl:border-b-0"><span className={`flex size-9 items-center justify-center rounded-lg ${tones[status]}`}><ClipboardList size={18} /></span><div><p className="text-2xl font-semibold text-gray-950">{count}</p><p className="text-xs font-medium text-gray-500">{status}</p></div></div>; }
function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[][] }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700"><>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</></select>; }
function ViewButton({ active, onClick, label, icon: Icon }: { active: boolean; onClick: () => void; label: string; icon: typeof List }) { return <button type="button" onClick={onClick} className={`inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-semibold ${active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}><Icon size={15} />{label}</button>; }
function WorkBoard({ items, onOpen, onMove, onCreateSubTask }: { items: WorkItem[]; onOpen: (item: WorkItem) => void; onMove: (item: WorkItem, status: WorkerStatus) => Promise<void>; onCreateSubTask?: (status: SubTaskStatus) => void; onInvalidMove?: (message: string | null) => void }) { if (onCreateSubTask || items[0]?.kind === "subtask") return <WorkerSubTaskBoard items={items} onOpen={onOpen} onMove={onMove} onCreateSubTask={onCreateSubTask} />; return <WorkerTaskBoard tasks={items.map((item) => item.source as TaskItem)} />; }
function WorkerTaskBoard({ tasks }: { tasks: TaskItem[] }) { const taskColumns = [{ title: "Pendiente", color: "gray" as const, matches: (status: string) => status === "Pendiente" }, { title: "En proceso", color: "blue" as const, matches: (status: string) => status === "En curso" || status === "En proceso" }, { title: "En revisión", color: "violet" as const, matches: (status: string) => status === "En revisión" }, { title: "Completada", color: "emerald" as const, matches: (status: string) => status === "Completado" || status === "Completada" }]; return <section className="overflow-x-auto pb-2"><div className="flex min-w-[1120px] gap-4">{taskColumns.map((column) => <TaskKanbanColumn key={column.title} title={column.title} color={column.color} tasks={tasks.filter((task) => column.matches(task.status))} taskHref={(task) => `/my-work/subtasks?taskId=${task.id}`} />)}</div></section>; }
function WorkerSubTaskBoard({ items, onOpen, onMove, onCreateSubTask }: { items: WorkItem[]; onOpen: (item: WorkItem) => void; onMove: (item: WorkItem, status: WorkerStatus) => Promise<void>; onCreateSubTask?: (status: SubTaskStatus) => void }) { function dragEnd(event: DragEndEvent) { const subTask = event.active.data.current?.subTask as SubTask | undefined; const destination = event.over?.id as SubTaskStatus | undefined; const item = subTask ? items.find((candidate) => candidate.id === subTask.id) : undefined; if (!item || !destination || destination === "Pausada" || item.status === destination) return; void onMove(item, destination); } return <section className="overflow-x-auto pb-2"><DndContext onDragEnd={dragEnd}><div className="grid min-w-[1120px] grid-cols-4 gap-4">{columns.map((status) => <SubTaskStatusColumn key={status} status={status} subTasks={items.filter((item) => item.status === status).map((item) => item.source as SubTask)} onOpenSubTask={(subTask) => { const item = items.find((candidate) => candidate.id === subTask.id); if (item) onOpen(item); }} onToggleComplete={(subTask) => { const item = items.find((candidate) => candidate.id === subTask.id); if (item) void onMove(item, item.status === "Completada" ? "Pendiente" : "Completada"); }} onCreateSubTask={onCreateSubTask} canCreate={Boolean(onCreateSubTask)} canEditStructure={false} canComplete={() => true} emptyMessage="Arrastra aquí una de tus subtareas." />)}</div></DndContext></section>; }
// The shared task board replaces this legacy generic task drop column. It remains
// only for the generic card helpers used while migrating existing worker views.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function WorkerDropColumn({ status, items, onOpen }: { status: WorkerStatus; items: WorkItem[]; onOpen: (item: WorkItem) => void }) { const { isOver, setNodeRef } = useDroppable({ id: status }); return <section ref={setNodeRef} className={`rounded-xl border border-gray-200 bg-gray-50/70 ${isOver ? "ring-2 ring-blue-300" : ""}`}><header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3"><h2 className="text-sm font-semibold text-gray-900">{status}</h2><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{items.length}</span></header><div className="min-h-64 space-y-3 p-3">{items.map((item) => <WorkerCard key={`${item.kind}-${item.id}`} item={item} onOpen={() => onOpen(item)} />)}{items.length === 0 && <p className="py-10 text-center text-xs text-gray-500">Suelta el trabajo aquí</p>}</div></section>; }
function WorkerCard({ item, onOpen }: { item: WorkItem; onOpen: () => void }) { const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `${item.kind}-${item.id}`, data: { item } }); const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined; return <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={isDragging ? "touch-none opacity-40" : "touch-none"}><WorkCard item={item} onOpen={onOpen} /></div>; }
function WorkCard({ item, onOpen }: { item: WorkItem; onOpen: () => void }) { return <button type="button" onClick={onOpen} className="block w-full rounded-lg border border-gray-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow"><span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${item.kind === "task" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}>{item.kind === "task" ? "TAREA" : "SUBTAREA"}</span><h3 className="mt-2 text-sm font-semibold leading-5 text-gray-950">{item.title}</h3><p className="mt-1 text-xs leading-5 text-gray-500">{item.kind === "task" ? `${item.project} · ${item.subProject}` : `Subtarea de: ${item.parentTask}`}</p>{item.kind === "task" && item.progress !== null && <p className="mt-3 text-xs font-medium text-gray-600">Progreso: {item.progress}%</p>}<div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs"><span className={isOverdue(item) ? "font-semibold text-red-700" : "text-gray-500"}>{isOverdue(item) ? "Atrasada" : dateLabel(item.endDate)}</span><span className="font-medium text-gray-700">{item.status}</span></div></button>; }
function WorkList({ items, onOpen }: { items: WorkItem[]; onOpen: (item: WorkItem) => void }) { if (items[0]?.kind === "task") return <TaskListView tasks={items.map((item) => item.source as TaskItem)} taskHref={(task) => `/my-work/subtasks?taskId=${task.id}`} />; return <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"><div className="divide-y">{items.map((item) => <button key={`${item.kind}-${item.id}`} type="button" onClick={() => onOpen(item)} className="grid w-full gap-3 px-5 py-4 text-left hover:bg-gray-50 md:grid-cols-[100px_1fr_150px_130px]"><span className={`w-fit rounded px-2 py-1 text-[10px] font-bold ${item.kind === "task" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}>{item.kind === "task" ? "TAREA" : "SUBTAREA"}</span><span><strong className="block text-sm text-gray-900">{item.title}</strong><small className="mt-1 block text-xs text-gray-500">{item.project || item.parentTask}</small></span><span className="text-sm text-gray-600">{item.status}</span><span className={isOverdue(item) ? "text-sm font-semibold text-red-700" : "text-sm text-gray-500"}>{dateLabel(item.endDate)}</span></button>)}{items.length === 0 && <p className="p-8 text-center text-sm text-gray-500">No hay trabajo que coincida con los filtros.</p>}</div></section>; }
function WorkDetail({ item, userId, updating, onClose, onStatus, onComments }: { item: WorkItem; userId: string; updating: boolean; onClose: () => void; onStatus: (item: WorkItem, status: WorkerStatus) => Promise<void>; onComments: (subTask: SubTask) => void }) { const [children, setChildren] = useState<SubTask[]>([]); const [loadingChildren, setLoadingChildren] = useState(item.kind === "task"); const [error, setError] = useState<string | null>(null); useEffect(() => { if (item.kind !== "task") return; void loadAllPages((page, pageSize) => subTasksService.getAll({ page, pageSize, taskItemId: item.id })).then(setChildren).catch((cause) => setError(cause instanceof ApiError ? cause.message : "No se pudieron cargar las subtareas.")).finally(() => setLoadingChildren(false)); }, [item]); const ownChildren = children.filter((child) => child.assignedUserId === userId); const otherChildren = children.filter((child) => child.assignedUserId !== userId); const next = item.kind === "subtask" ? item.status === "Pendiente" ? "En proceso" : item.status === "En proceso" ? "En revisión" : item.status === "En revisión" ? "Completada" : null : null; return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"><header className="flex items-start justify-between border-b px-6 py-5"><div><span className="text-xs font-bold text-blue-700">{item.kind === "task" ? "TAREA" : "SUBTAREA"}</span><h2 className="mt-1 text-xl font-semibold text-gray-950">{item.title}</h2><p className="mt-1 text-sm text-gray-600">{item.kind === "task" ? `${item.project} › ${item.subProject}` : `Tarea: ${item.parentTask}`}</p></div><button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100">×</button></header><div className="space-y-5 p-6"><div className="grid gap-3 sm:grid-cols-3"><Detail label="Estado" value={item.status} /><Detail label="Fecha límite" value={dateLabel(item.endDate)} /><Detail label="Responsable" value="Tú" /></div>{item.detail && <div><h3 className="text-sm font-semibold text-gray-900">Descripción</h3><p className="mt-2 text-sm leading-6 text-gray-600">{item.detail}</p></div>}{item.kind === "subtask" && <button onClick={() => onComments(item.source as SubTask)} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"><MessageSquare size={16} />Comentarios</button>}{next && <button disabled={updating} onClick={() => void onStatus(item, next)} className="inline-flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50">{updating ? "Actualizando..." : next === "En proceso" ? "Iniciar trabajo" : next === "En revisión" ? "Enviar a revisión" : "Marcar completada"}</button>}{item.kind === "task" && <div className="space-y-4 border-t pt-5"><h3 className="font-semibold text-gray-900">Mis subtareas</h3>{loadingChildren ? <p className="text-sm text-gray-500">Cargando subtareas…</p> : ownChildren.map((child) => <ChildRow key={child.id} child={child} own />)}{ownChildren.length === 0 && !loadingChildren && <p className="text-sm text-gray-500">No tienes subtareas propias en esta tarea.</p>}<h3 className="border-t pt-5 font-semibold text-gray-900">Otras subtareas</h3>{otherChildren.map((child) => <ChildRow key={child.id} child={child} own={false} />)}{otherChildren.length === 0 && <p className="text-sm text-gray-500">No hay subtareas de otros responsables.</p>}{error && <p className="text-sm text-red-700">{error}</p>}</div>}</div></section></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-gray-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p><p className="mt-1 text-sm font-medium text-gray-800">{value}</p></div>; }
function ChildRow({ child, own }: { child: SubTask; own: boolean }) { return <div className="rounded-lg border border-gray-200 p-3"><p className="text-sm font-semibold text-gray-900">{child.title}</p><p className="mt-1 text-xs text-gray-500">{own ? "Tu subtarea" : `Responsable: ${child.assignedUserFirstName ?? "Sin asignar"} ${child.assignedUserLastName ?? ""}`}</p><span className="mt-2 inline-flex rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{child.status}</span></div>; }
