export type WorkLevel = "Project" | "SubProject" | "Task" | "SubTask";

export interface DelayReportQuery {
    projectId?: string;
    subProjectId?: string;
    responsibleUserId?: string;
    level?: WorkLevel;
    dateFrom?: string;
    dateTo?: string;
    onlyDelayed?: boolean;
}

export interface DelaySummary {
    totalItemCount: number;
    completedItemCount: number;
    delayedItemCount: number;
    averageDelayDays: number;
    maximumDelayDays: number;
    onTimePercentage: number;
    averageCycleDays: number;
    currentlyOverdueCount: number;
}

export interface DelayItem {
    level: WorkLevel;
    id: string;
    parentId?: string;
    projectId: string;
    projectName: string;
    clientCompanyId?: string;
    clientCompanyName?: string;
    departmentId?: string;
    departmentName?: string;
    subProjectId?: string;
    taskId?: string;
    title: string;
    status: string;
    responsibleUserId?: string;
    responsibleUserName?: string;
    plannedStartDate: string;
    plannedEndDate?: string;
    actualStartedAt?: string;
    completedAt?: string;
    isCompleted: boolean;
    isDelayed: boolean;
    delayDays?: number;
    startDelayDays?: number;
    plannedDurationDays?: number;
    actualDurationDays: number;
    actualDurationHours?: number;
    dataQuality: "Exact" | "Estimated";
    completionSource: string;
    timeByStatusHours: Record<string, number>;
}

export interface DelayReport {
    generatedAt: string;
    summary: DelaySummary;
    items: DelayItem[];
}
