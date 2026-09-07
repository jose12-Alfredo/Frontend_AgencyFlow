import { apiFetch, buildQuery } from "@/services/api";
import { PagedResult } from "@/types/common.types";
import { NotificationItem, NotificationSummary } from "@/types/notification.types";

export const notificationsService = {
    getAll(page = 1, pageSize = 20, unreadOnly = false): Promise<PagedResult<NotificationItem>> {
        return apiFetch(`/api/notifications${buildQuery({ page, pageSize, unreadOnly })}`);
    },
    getSummary: (): Promise<NotificationSummary> => apiFetch("/api/notifications/summary"),
    markAsRead: (id: string): Promise<void> => apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }),
    markAllAsRead: (): Promise<void> => apiFetch("/api/notifications/read-all", { method: "PATCH" })
};
