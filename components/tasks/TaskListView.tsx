"use client";

import Link from "next/link";
import {
    CalendarDays,
    CircleAlert,
    Pencil,
    Trash2
} from "lucide-react";
import { TaskItem } from "@/types/task.types";

interface TaskListViewProps {
    tasks: TaskItem[];
    onEdit?: (task: TaskItem) => void;
    onDelete?: (task: TaskItem) => void;
    taskHref?: (task: TaskItem) => string;
}

const STATUS_STYLES: Record<string, string> = {
    Pendiente: "bg-gray-100 text-gray-700",
    "En curso": "bg-blue-50 text-blue-700",
    "En proceso": "bg-blue-50 text-blue-700",
    "En revisión": "bg-violet-50 text-violet-700",
    Completado: "bg-emerald-50 text-emerald-700",
    Completada: "bg-emerald-50 text-emerald-700"
};

function formatDate(value: string | null): string {
    if (!value) return "Sin fecha";

    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-BO", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(new Date(year, month - 1, day));
}

function getDaysOverdue(task: TaskItem): number {
    if (
        !task.endDate ||
        task.status === "Completado" ||
        task.status === "Completada"
    ) {
        return 0;
    }

    const [year, month, day] = task.endDate.split("-").map(Number);
    const dueDate = Date.UTC(year, month - 1, day);
    const now = new Date();
    const today = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    return Math.max(0, Math.floor((today - dueDate) / 86_400_000));
}

export function TaskListView({
    tasks,
    onEdit,
    onDelete,
    taskHref
}: TaskListViewProps) {
    const hasAdministrativeActions = Boolean(onEdit || onDelete);

    if (tasks.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center border border-dashed border-gray-300 bg-white px-6 text-center text-sm text-gray-500">
                No hay tareas que coincidan con los filtros seleccionados.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto border-y border-gray-200 bg-white">
            <table className="w-full min-w-[1040px] table-fixed text-left">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                    <tr>
                        <th className={`${hasAdministrativeActions ? "w-[24%]" : "w-[26%]"} px-4 py-3`}>Tarea</th>
                        <th className="w-[21%] px-4 py-3">Cliente</th>
                        <th className="w-[12%] px-4 py-3">Estado</th>
                        <th className="w-[14%] px-4 py-3">Responsable</th>
                        <th className="w-[13%] px-4 py-3">Fechas</th>
                        <th className="w-[11%] px-4 py-3">Progreso</th>
                        {hasAdministrativeActions && <th className="w-[5%] px-4 py-3 text-right">Acciones</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {tasks.map((task) => {
                        const responsible = [
                            task.assignedUserFirstName,
                            task.assignedUserLastName
                        ].filter(Boolean).join(" ");
                        const daysOverdue = getDaysOverdue(task);

                        return (
                            <tr key={task.id} className="align-top hover:bg-gray-50/70">
                                <td className="px-4 py-4">
                                    <Link
                                        href={taskHref?.(task) ?? `/subtasks?subProjectId=${task.subProjectId}&taskId=${task.id}`}
                                        className="break-words text-sm font-semibold text-gray-950 hover:text-blue-700"
                                    >
                                        {task.title}
                                    </Link>
                                    <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-gray-500">
                                        {task.detail || "Sin descripción"}
                                    </p>
                                </td>
                                <td className="px-4 py-4 text-xs leading-5">
                                    <p className="font-semibold text-blue-700">
                                        {task.clientCompanyName ?? "Sin empresa cliente"}
                                    </p>
                                    <p className="mt-1 break-words text-gray-700">
                                        {task.projectTitle}
                                    </p>
                                    <p className="break-words text-gray-500">
                                        {task.subProjectTitle}
                                    </p>
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${STATUS_STYLES[task.status] ?? "bg-gray-100 text-gray-700"}`}>
                                        {task.status}
                                    </span>
                                    {daysOverdue > 0 && (
                                        <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-700">
                                            <CircleAlert size={13} />
                                            {daysOverdue} {daysOverdue === 1 ? "día" : "días"} de atraso
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-700">
                                    {responsible || "Sin responsable"}
                                </td>
                                <td className="px-4 py-4 text-xs leading-5 text-gray-600">
                                    <p>Creada: {formatDate(task.createdAt.slice(0, 10))}</p>
                                    <p className="mt-1 inline-flex items-center gap-1">
                                        <CalendarDays size={13} />
                                        Límite: {formatDate(task.endDate)}
                                    </p>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500">
                                            {task.completedSubTaskCount}/{task.subTaskCount}
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                            {task.progressPercentage}%
                                        </span>
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                                        <div
                                            className="h-full bg-emerald-500"
                                            style={{ width: `${task.progressPercentage}%` }}
                                        />
                                    </div>
                                </td>
                                {hasAdministrativeActions && <td className="px-4 py-4">
                                    <div className="flex justify-end gap-1">
                                        {onEdit &&
                                        <button
                                            type="button"
                                            title="Editar tarea"
                                            aria-label={`Editar ${task.title}`}
                                            onClick={() => onEdit(task)}
                                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
                                        >
                                            <Pencil size={16} />
                                        </button>}
                                        {onDelete && <button
                                            type="button"
                                            title="Eliminar tarea"
                                            aria-label={`Eliminar ${task.title}`}
                                            onClick={() => onDelete(task)}
                                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Trash2 size={16} />
                                        </button>}
                                    </div>
                                </td>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
