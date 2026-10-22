export interface NotificationItem {
    id: string;
    type: "created" | "assignment" | "comment" | "status" | "review" | "deadline" | "overdue" | string;
    title: string;
    message: string;
    resourceType: "task" | "subtask" | string | null;
    resourceId: string | null;
    url: string | null;
    createdAt: string;
    readAt: string | null;
    isRead: boolean;
}

export interface NotificationSummary {
    unreadCount: number;
}
