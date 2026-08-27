"use client";

import { CSS } from "@dnd-kit/utilities";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
    CalendarDays,
    Check,
    CircleAlert,
    GripVertical,
    MessageSquare,
    Pencil,
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
    onEditSubTask: (subTask: SubTask) => void;
    onToggleComplete: (subTask: SubTask) => void;
    onCreateSubTask: (status: SubTaskStatus) => void;
}

const STATUS_STYLES: Record<
    SubTaskStatus,
    { dot: string; header: string; drop: string }
> = {
    Pendiente: {
        dot: "bg-gray-500",
        header: "border-gray-300",
        drop: "bg-gray-200 ring-gray-400"
    },
    "En proceso": {
        dot: "bg-blue-500",
        header: "border-blue-200",
        drop: "bg-blue-50 ring-blue-300"
    },
    "En revisión": {
        dot: "bg-violet-500",
        header: "border-violet-200",
        drop: "bg-violet-50 ring-violet-300"
    },
    Completada: {
        dot: "bg-emerald-500",
        header: "border-emerald-200",
        drop: "bg-emerald-50 ring-emerald-300"
    },
    Pausada: {
        dot: "bg-amber-500",
        header: "border-amber-200",
        drop: "bg-amber-50 ring-amber-300"
    }
};

function formatDate(value: string | null): string {
    if (!value) {
        return "Sin fecha";
    }

    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-BO", {
        day: "2-digit",
        month: "short"
    }).format(new Date(year, month - 1, day));
}

function DraggableSubTaskCard({
    subTask,
    onOpen,
    onEdit,
    onToggleComplete
}: {
    subTask: SubTask;
    onOpen: () => void;
    onEdit: () => void;
    onToggleComplete: () => void;
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
            className={`cursor-grab touch-none rounded-md border border-gray-200 bg-white p-3 shadow-sm transition hover:border-gray-300 hover:shadow active:cursor-grabbing ${
                isDragging ? "z-50 opacity-50 shadow-lg" : ""
            }`}
        >
            <div className="flex items-start gap-2">
                <button
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
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition ${
                        isCompleted
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-gray-300 bg-white text-transparent hover:border-emerald-500"
                    }`}
                >
                    <Check size={14} strokeWidth={3} />
                </button>

                <button
                    type="button"
                    onClick={onOpen}
                    className="min-w-0 flex-1 text-left"
                >
                    <span
                        className={`block text-sm font-semibold leading-5 ${
                            isCompleted
                                ? "text-gray-500 line-through"
                                : "text-gray-900"
                        }`}
                    >
                        {subTask.title}
                    </span>
                    {subTask.detail && (
                        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-gray-500">
                            {subTask.detail}
                        </span>
                    )}
                    {subTask.isOverdue && (
                        <span className="mt-2 flex w-fit items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                            <CircleAlert size={13} />
                            Atrasada
                        </span>
                    )}
                </button>

                <div className="flex shrink-0 items-center">
                    <button
                        type="button"
                        title="Editar subtarea"
                        aria-label={`Editar ${subTask.title}`}
                        onClick={onEdit}
                        onPointerDown={(event) => event.stopPropagation()}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                        <Pencil size={15} />
                    </button>
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

            <button
                type="button"
                onClick={onOpen}
                className="mt-3 flex w-full items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500"
            >
                <span className="flex items-center gap-1.5">
                    <CalendarDays size={14} />
                    Fecha límite: {formatDate(subTask.endDate)}
                </span>
                <span
                    className={`flex items-center gap-1 ${
                        subTask.commentCount > 0
                            ? "font-semibold text-blue-700"
                            : ""
                    }`}
                >
                    <MessageSquare size={14} />
                    {subTask.commentCount === 0
                        ? "Comentar"
                        : `${subTask.commentCount} ${
                            subTask.commentCount === 1
                                ? "comentario"
                                : "comentarios"
                        }`}
                </span>
            </button>
        </article>
    );
}

export function SubTaskStatusColumn({
    status,
    subTasks,
    onOpenSubTask,
    onEditSubTask,
    onToggleComplete,
    onCreateSubTask
}: SubTaskStatusColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: status,
        data: { status }
    });
    const styles = STATUS_STYLES[status];

    return (
        <section className="flex h-[calc(100vh-20rem)] min-h-[430px] w-[286px] shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
            <header
                className={`flex h-12 shrink-0 items-center justify-between border-b-2 bg-white px-4 ${styles.header}`}
            >
                <div className="flex min-w-0 items-center gap-2">
                    <span className={`size-2.5 rounded-full ${styles.dot}`} />
                    <h2 className="truncate text-sm font-semibold text-gray-900">
                        {status}
                    </h2>
                    <span className="text-xs font-medium text-gray-400">
                        {subTasks.length}
                    </span>
                </div>
                <button
                    type="button"
                    title={`Agregar subtarea ${status.toLowerCase()}`}
                    aria-label={`Agregar subtarea ${status.toLowerCase()}`}
                    onClick={() => onCreateSubTask(status)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                    <Plus size={17} />
                </button>
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
                        onEdit={() => onEditSubTask(subTask)}
                        onToggleComplete={() => onToggleComplete(subTask)}
                    />
                ))}

                {subTasks.length === 0 && (
                    <div className="rounded-md border border-dashed border-gray-300 px-3 py-7 text-center text-xs leading-5 text-gray-500">
                        Sin subtareas en este estado.
                    </div>
                )}
            </div>
        </section>
    );
}
