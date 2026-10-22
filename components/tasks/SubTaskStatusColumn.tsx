"use client";

import { CSS } from "@dnd-kit/utilities";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
    CalendarDays,
    Check,
    ClipboardList,
    CircleAlert,
    GripVertical,
    MessageSquare,
    MoreVertical,
    Plus,
    UserRound
} from "lucide-react";
import {
    SubTask,
    SubTaskStatus
} from "@/types/subtask.types";

interface SubTaskStatusColumnProps {
    status: SubTaskStatus;
    subTasks: SubTask[];
    onOpenSubTask: (subTask: SubTask) => void;
    onOpenComments?: (subTask: SubTask) => void;
    onEditSubTask?: (subTask: SubTask) => void;
    onToggleComplete?: (subTask: SubTask) => void;
    onCreateSubTask?: (status: SubTaskStatus) => void;
    canCreate?: boolean;
    canEditStructure?: boolean;
    canComplete?: (subTask: SubTask) => boolean;
    emptyMessage?: string;
}

const STATUS_STYLES: Record<
    SubTaskStatus,
    { dot: string; header: string; drop: string; surface: string; action: string }
> = {
    Pendiente: {
        dot: "bg-rose-500",
        header: "border-rose-200",
        drop: "bg-rose-50 ring-rose-200",
        surface: "bg-rose-50/40",
        action: "border-rose-200 text-rose-600 hover:bg-rose-50"
    },
    "En proceso": {
        dot: "bg-blue-500",
        header: "border-blue-200",
        drop: "bg-blue-50 ring-blue-200",
        surface: "bg-blue-50/35",
        action: "border-blue-200 text-blue-600 hover:bg-blue-50"
    },
    "En revisión": {
        dot: "bg-violet-500",
        header: "border-violet-200",
        drop: "bg-violet-50 ring-violet-200",
        surface: "bg-violet-50/35",
        action: "border-violet-200 text-violet-600 hover:bg-violet-50"
    },
    Completada: {
        dot: "bg-emerald-500",
        header: "border-emerald-200",
        drop: "bg-emerald-50 ring-emerald-200",
        surface: "bg-emerald-50/35",
        action: "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
    },
    Pausada: {
        dot: "bg-amber-500",
        header: "border-amber-200",
        drop: "bg-amber-50 ring-amber-200",
        surface: "bg-amber-50/35",
        action: "border-amber-200 text-amber-700 hover:bg-amber-50"
    }
};

function formatDate(value: string | null): string {
    if (!value) {
        return "Sin fecha límite";
    }

    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-BO", {
        day: "2-digit",
        month: "short"
    }).format(new Date(year, month - 1, day));
}

function SubTaskDetail({ detail }: { detail: string }) {
    const parts = detail.split(/(https?:\/\/[^\s]+)/g);

    return (
        <div className="mt-1 text-xs leading-5">
            <p className="font-semibold text-gray-700">Detalle:</p>
            <p className="whitespace-pre-wrap break-words text-gray-500">
                {parts.map((part, index) => part.startsWith("http://") || part.startsWith("https://") ? (
                    <a
                        key={`${part}-${index}`}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                    >
                        {part}
                    </a>
                ) : part)}
            </p>
        </div>
    );
}

function DraggableSubTaskCard({
    subTask,
    onOpen,
    onEdit,
    onToggleComplete,
    onOpenComments,
    canEdit,
    canComplete
}: {
    subTask: SubTask;
    onOpen: () => void;
    onEdit?: () => void;
    onToggleComplete?: () => void;
    onOpenComments?: () => void;
    canEdit: boolean;
    canComplete: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        isDragging
    } = useDraggable({
        id: subTask.id,
        data: { subTask }
    });

    const style = transform
        ? { transform: CSS.Translate.toString(transform) }
        : undefined;
    const isCompleted = subTask.status === "Completada";
    const responsible = [
        subTask.assignedUserFirstName,
        subTask.assignedUserLastName
    ].filter(Boolean).join(" ");

    return (
        <article
            ref={(node) => {
                setNodeRef(node);
                setActivatorNodeRef(node);
            }}
            style={style}
            {...listeners}
            {...attributes}
            className={`cursor-grab touch-none rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:border-gray-300 hover:shadow-md active:cursor-grabbing ${
                isDragging ? "z-50 opacity-50 shadow-lg" : ""
            }`}
        >
            <div className="flex items-start gap-2">
                {canComplete && onToggleComplete && <button
                    type="button"
                    title={
                        isCompleted
                            ? "Marcar como pendiente"
                            : "Marcar como completada"
                    }
                    aria-label={
                        isCompleted
                            ? `Reabrir ${subTask.title}`
                            : `Completar ${subTask.title}`
                    }
                    onClick={onToggleComplete}
                    onPointerDown={(event) => event.stopPropagation()}
                    className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition ${
                        isCompleted
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-gray-300 bg-white text-transparent hover:border-emerald-500"
                    }`}
                >
                    <Check size={14} strokeWidth={3} />
                </button>}

                <div className="min-w-0 flex-1 text-left">
                    <button type="button" onClick={onOpen} className="block w-full text-left">
                        <span
                            className={`block text-sm font-semibold leading-5 ${
                                isCompleted
                                    ? "text-gray-500 line-through"
                                    : "text-gray-900"
                            }`}
                        >
                            {subTask.title}
                        </span>
                    </button>
                    {subTask.detail && <SubTaskDetail detail={subTask.detail} />}
                    {subTask.isOverdue && (
                        <span className="mt-2 flex w-fit items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                            <CircleAlert size={13} />
                            Atrasada
                        </span>
                    )}
                    {subTask.status === "Pausada" && (
                        <span className="mt-2 flex w-fit rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                            Pausada
                        </span>
                    )}
                </div>

                <div className="flex shrink-0 items-center">
                    {canEdit && onEdit && <button
                        type="button"
                        title="Editar subtarea"
                        aria-label={`Editar ${subTask.title}`}
                        onClick={onEdit}
                        onPointerDown={(event) => event.stopPropagation()}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                        <MoreVertical size={17} />
                    </button>}
                    <button
                        type="button"
                        title="Mover subtarea"
                        aria-label={`Mover ${subTask.title}`}
                        className="pointer-events-none rounded p-1 text-gray-400"
                    >
                        <GripVertical size={16} />
                    </button>
                </div>
            </div>

            <div className="mt-3 flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
                <UserRound size={14} className="shrink-0" />
                <span className="truncate">
                    Responsable: {responsible || "Sin asignar"}
                </span>
            </div>

            <div className="mt-3 flex w-full items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                <button type="button" onClick={onOpen} onPointerDown={(event) => event.stopPropagation()} className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-gray-50 hover:text-gray-800">
                    <CalendarDays size={14} />
                    {formatDate(subTask.endDate)}
                </button>
                <button
                    type="button"
                    title="Abrir comentarios"
                    aria-label={`Abrir ${subTask.commentCount} comentarios de ${subTask.title}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        (onOpenComments ?? onOpen)();
                    }}
                    className={`flex items-center gap-1 ${
                        subTask.commentCount > 0
                            ? "rounded px-1.5 py-0.5 font-semibold text-blue-700 hover:bg-blue-50"
                            : "rounded px-1.5 py-0.5 hover:bg-gray-50 hover:text-gray-800"
                    }`}
                >
                    <MessageSquare size={14} />
                    {subTask.commentCount}
                </button>
            </div>
        </article>
    );
}

export function SubTaskStatusColumn({
    status,
    subTasks,
    onOpenSubTask,
    onOpenComments,
    onEditSubTask,
    onToggleComplete,
    onCreateSubTask,
    canCreate = true,
    canEditStructure = true,
    canComplete = () => true,
    emptyMessage = "Arrastra o crea una nueva subtarea"
}: SubTaskStatusColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: status,
        data: { status }
    });
    const styles = STATUS_STYLES[status];

    return (
        <section className={`flex h-[calc(100vh-29rem)] min-h-[430px] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 ${styles.surface}`}>
            <header
                className={`flex h-14 shrink-0 items-center justify-between border-b-2 bg-white px-4 ${styles.header}`}
            >
                <div className="flex min-w-0 items-center gap-2">
                    <span className={`size-2.5 rounded-full ${styles.dot}`} />
                    <h2 className="truncate text-sm font-semibold text-gray-900">
                        {status}
                    </h2>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        {subTasks.length}
                    </span>
                </div>
                {canCreate && onCreateSubTask && <button
                    type="button"
                    title={`Agregar subtarea ${status.toLowerCase()}`}
                    aria-label={`Agregar subtarea ${status.toLowerCase()}`}
                    onClick={() => onCreateSubTask(status)}
                    className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                >
                    <Plus size={17} />
                </button>}
            </header>

            <div
                ref={setNodeRef}
                className={`flex-1 space-y-3 overflow-y-auto p-3 transition ${
                    isOver ? `${styles.drop} ring-2 ring-inset` : ""
                }`}
            >
                {subTasks.map((subTask) => (
                    <DraggableSubTaskCard
                        key={subTask.id}
                        subTask={subTask}
                        onOpen={() => onOpenSubTask(subTask)}
                        onOpenComments={onOpenComments ? () => onOpenComments(subTask) : undefined}
                        onEdit={onEditSubTask ? () => onEditSubTask(subTask) : undefined}
                        onToggleComplete={onToggleComplete ? () => onToggleComplete(subTask) : undefined}
                        canEdit={canEditStructure}
                        canComplete={canComplete(subTask)}
                    />
                ))}

                {subTasks.length === 0 && (
                    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white/50 px-3 py-6 text-center text-xs leading-5 text-gray-500">
                        <span className={`mb-3 flex size-10 items-center justify-center rounded-full border border-dashed ${styles.action}`}><ClipboardList size={18} /></span>
                        <strong className="text-sm font-semibold text-gray-800">Sin subtareas</strong>
                        <span className="mt-1">{emptyMessage}</span>
                        {canCreate && onCreateSubTask && <button type="button" onClick={() => onCreateSubTask(status)} className={`mt-4 inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold transition ${styles.action}`}><Plus size={15} />Crear subtarea</button>}
                    </div>
                )}
            </div>
        </section>
    );
}
