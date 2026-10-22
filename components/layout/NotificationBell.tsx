"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, CircleAlert, Clock3, ListPlus, MessageSquareText, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { notificationsService } from "@/services/notifications.service";
import { NotificationItem } from "@/types/notification.types";

export function NotificationBell({ isWorker }: { isWorker: boolean }) {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadSummary = useCallback(async () => {
        try {
            setUnreadCount((await notificationsService.getSummary()).unreadCount);
        } catch {
            // La campana no debe interrumpir el resto de la aplicacion.
        }
    }, []);

    const loadItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await notificationsService.getAll();
            setItems(result.items);
            setUnreadCount(result.items.filter((item) => !item.isRead).length);
        } catch {
            setError("No se pudieron cargar las notificaciones.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initial = window.setTimeout(() => void loadSummary(), 0);
        const timer = window.setInterval(() => void loadSummary(), 30_000);
        return () => {
            window.clearTimeout(initial);
            window.clearInterval(timer);
        };
    }, [loadSummary]);

    useEffect(() => {
        function closeOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", closeOutside);
        return () => document.removeEventListener("mousedown", closeOutside);
    }, []);

    async function toggle() {
        const next = !open;
        setOpen(next);
        if (next) await loadItems();
    }

    async function openNotification(item: NotificationItem) {
        if (!item.isRead) {
            setItems((current) => current.map((value) => value.id === item.id ? { ...value, isRead: true } : value));
            setUnreadCount((current) => Math.max(0, current - 1));
            void notificationsService.markAsRead(item.id).catch(() => void loadSummary());
        }
        setOpen(false);
        const href = isWorker ? workerNotificationHref(item) : item.url;
        if (href) router.push(href);
    }

    async function markAll() {
        await notificationsService.markAllAsRead();
        setItems((current) => current.map((item) => ({ ...item, isRead: true })));
        setUnreadCount(0);
    }

    return <div ref={containerRef} className="relative">
        <button type="button" aria-label={unreadCount ? `${unreadCount} notificaciones sin leer` : "Notificaciones"} aria-expanded={open} onClick={() => void toggle()} className="relative grid h-10 w-10 place-items-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <Bell size={19} />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-4 text-white ring-2 ring-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </button>
        {open && <section aria-label="Notificaciones" className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[390px]">
            <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
                <div><h2 className="text-sm font-bold text-gray-950">Notificaciones</h2><p className="mt-0.5 text-xs text-gray-500">{unreadCount ? `${unreadCount} sin leer` : "Todo al día"}</p></div>
                {unreadCount > 0 && <button type="button" onClick={() => void markAll()} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"><CheckCheck size={15} />Marcar todas</button>}
            </header>
            <div className="max-h-[min(70vh,520px)] overflow-y-auto">
                {loading && <p className="px-4 py-10 text-center text-sm text-gray-500">Cargando notificaciones…</p>}
                {!loading && error && <p className="px-4 py-10 text-center text-sm text-red-700">{error}</p>}
                {!loading && !error && items.length === 0 && <div className="px-6 py-12 text-center"><Bell className="mx-auto text-gray-300" size={28} /><p className="mt-3 text-sm font-semibold text-gray-800">No tienes notificaciones</p><p className="mt-1 text-xs text-gray-500">Las novedades de tu trabajo aparecerán aquí.</p></div>}
                {!loading && !error && items.map((item) => {
                    const { action, context } = splitNotificationMessage(item.message);

                    return <button key={item.id} type="button" onClick={() => void openNotification(item)} className={`flex w-full gap-3 border-b border-gray-100 px-4 py-3.5 text-left transition last:border-0 hover:bg-gray-50 ${item.isRead ? "bg-white" : "bg-blue-50/60"}`}>
                        <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${iconStyle(item.type)}`}>{notificationIcon(item.type)}</span>
                        <span className="min-w-0 flex-1"><span className="flex items-start gap-2"><strong className="flex-1 text-sm font-semibold text-gray-900">{item.title}</strong>{!item.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}</span><span className="mt-1 block text-xs leading-5 text-gray-700">{action}</span>{context.length > 0 && <span className="mt-2 block rounded-md border border-gray-100 bg-white/80 px-2.5 py-2 text-[11px] leading-4 text-gray-500">{context.map((detail) => <span key={detail} className="block truncate">{detail}</span>)}</span>}<time className="mt-1.5 block text-[11px] font-medium text-gray-400">{relativeTime(item.createdAt)}</time></span>
                    </button>;
                })}
            </div>
        </section>}
    </div>;
}

function notificationIcon(type: string) {
    if (type === "created") return <ListPlus size={17} />;
    if (type === "assignment") return <UserRoundPlus size={17} />;
    if (type === "comment") return <MessageSquareText size={17} />;
    if (type === "overdue") return <CircleAlert size={17} />;
    return <Clock3 size={17} />;
}

function iconStyle(type: string) {
    if (type === "created") return "bg-blue-100 text-blue-700";
    if (type === "overdue") return "bg-red-100 text-red-700";
    if (type === "comment") return "bg-violet-100 text-violet-700";
    if (type === "assignment") return "bg-emerald-100 text-emerald-700";
    return "bg-amber-100 text-amber-700";
}

function relativeTime(value: string) {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
    if (minutes < 1) return "Ahora";
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    return `Hace ${Math.floor(hours / 24)} d`;
}

function workerNotificationHref(item: NotificationItem): string {
    if (item.resourceType !== "subtask") return "/my-work/tasks";

    const taskId = item.url
        ? new URL(item.url, "http://localhost").searchParams.get("taskId")
        : null;
    return taskId
        ? `/my-work/subtasks?taskId=${encodeURIComponent(taskId)}`
        : "/my-work/subtasks";
}

function splitNotificationMessage(message: string): { action: string; context: string[] } {
    const lines = message.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length > 1) {
        return { action: lines[0], context: lines.slice(1) };
    }

    const contextMarkers = ["Cliente: ", "Proyecto: "];
    const markerIndex = contextMarkers
        .map((marker) => message.indexOf(marker))
        .filter((index) => index >= 0)
        .sort((left, right) => left - right)[0] ?? -1;

    if (markerIndex === -1) {
        return { action: message, context: [] };
    }

    return {
        action: message.slice(0, markerIndex).trim(),
        context: message.slice(markerIndex)
            .split(/\s+(?:·|Â·)\s+/)
            .filter(Boolean)
    };
}
