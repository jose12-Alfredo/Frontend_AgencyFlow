"use client";

import Link from "next/link";
import {
    CalendarDays,
    ListChecks,
    Pencil,
    Trash2,
    UserRound
} from "lucide-react";
import { TaskItem } from "@/types/task.types";

interface TaskKanbanColumnProps {
    title: string;
    tasks: TaskItem[];
    color: "gray" | "blue" | "violet" | "emerald";
    onEdit: (task: TaskItem) => void;
    onDelete: (task: TaskItem) => void;
}

const COLUMN_STYLES = {
    gray: { dot: "bg-gray-500", border: "border-gray-300" },
    blue: { dot: "bg-blue-500", border: "border-blue-200" },
    violet: { dot: "bg-violet-500", border: "border-violet-200" },
    emerald: { dot: "bg-emerald-500", border: "border-emerald-200" }
};

function formatDate(value: string): string {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-BO", {
        day: "2-digit",
        month: "short"
    }).format(new Date(year, month - 1, day));
}

function getSchedule(task: TaskItem) {
    if (task.status === "Completado" || task.status === "Completada") {
        return { label: "Completada", className: "text-emerald-700" };
    }

    if (!task.endDate) {
        return { label: "Sin fecha límite", className: "text-gray-500" };
    }

    const today = new Date();
    const todayUtc = Date.UTC(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );
    const [year, month, day] = task.endDate.split("-").map(Number);
    const dueUtc = Date.UTC(year, month - 1, day);
    const days = Math.round((dueUtc - todayUtc) / 86_400_000);

    if (days < 0) {
        const overdueDays = Math.abs(days);
        return {
            label: `${overdueDays} ${overdueDays === 1 ? "día" : "días"} de atraso`,
            className: "text-red-700"
        };
    }

    if (days === 0) {
        return { label: "Vence hoy", className: "text-amber-700" };
    }

    return {
        label: `${days} ${days === 1 ? "día restante" : "días restantes"}`,
        className: days <= 3 ? "text-amber-700" : "text-gray-500"
    };
}

function TaskCard({
    task,
    onEdit,
    onDelete
}: {
    task: TaskItem;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const responsible = [
        task.assignedUserFirstName,
        task.assignedUserLastName
    ].filter(Boolean).join(" ");
    const schedule = getSchedule(task);

    return (
        <article className="rounded-md border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold uppercase text-blue-700">
                        {task.clientCompanyName ?? "Sin empresa cliente"}
                    </p>
                    <Link
                        href={`/subtasks?subProjectId=${task.subProjectId}&taskId=${task.id}`}
                        className="mt-1 block break-words text-sm font-semibold leading-5 text-gray-950 hover:text-blue-700"
                    >
                        {task.title}
                    </Link>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                    <button
                        type="button"
                        title="Editar tarea"
                        aria-label={`Editar ${task.title}`}
                        onClick={onEdit}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
                    >
                        <Pencil size={15} />
                    </button>
                    <button
                        type="button"
                        title="Eliminar tarea"
                        aria-label={`Eliminar ${task.title}`}
                        onClick={onDelete}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            <p className="mt-2 break-words text-xs leading-5 text-gray-500">
                {task.projectTitle} <span aria-hidden="true">/</span>{" "}
                {task.subProjectTitle}
            </p>

            <div className="mt-4 flex items-center justify-between text-xs">
                <span className="font-medium text-gray-600">Progreso</span>
                <span className="font-semibold text-gray-950">
                    {task.progressPercentage}%
                </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                    className="h-full bg-emerald-500 transition-[width] duration-300"
                    style={{ width: `${task.progressPercentage}%` }}
                />
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                <ListChecks size={14} className="shrink-0" />
                {task.completedSubTaskCount} de {task.subTaskCount} subtareas
            </div>
            <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
                <UserRound size={14} className="shrink-0" />
                <span className="truncate">
                    {responsible || "Sin responsable"}
                </span>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3 border-t border-gray-100 pt-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-gray-500">
                    <CalendarDays size={14} />
                    {task.endDate ? formatDate(task.endDate) : "Sin fecha"}
                </span>
                <span className={`text-right font-semibold ${schedule.className}`}>
                    {schedule.label}
                </span>
            </div>
        </article>
    );
}

export function TaskKanbanColumn({
    title,
    tasks,
    color,
    onEdit,
    onDelete
}: TaskKanbanColumnProps) {
    const styles = COLUMN_STYLES[color];

    return (
        <section className="flex h-[calc(100vh-16rem)] min-h-[520px] w-[310px] shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
            <header className={`flex h-12 shrink-0 items-center gap-2 border-b-2 bg-white px-4 ${styles.border}`}>
                <span className={`size-2.5 rounded-full ${styles.dot}`} />
                <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
                <span className="text-xs font-medium text-gray-400">
                    {tasks.length}
                </span>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={() => onEdit(task)}
                        onDelete={() => onDelete(task)}
                    />
                ))}

                {tasks.length === 0 && (
                    <div className="rounded-md border border-dashed border-gray-300 px-3 py-8 text-center text-xs leading-5 text-gray-500">
                        No hay tareas en este estado.
                    </div>
                )}
            </div>
        </section>
    );
}
