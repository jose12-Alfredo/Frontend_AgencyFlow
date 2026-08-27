export interface DashboardData {
    kpis: DashboardKpis;
    workload: WorkloadItem[];
    workflowDistribution: WorkflowDistributionItem[];
    pausedTaskCount: number;
    subProjectHealth: SubProjectHealthItem[];
    upcomingDeadlines: DashboardTaskItem[];
    stalledTasks: StalledTaskItem[];
    stalledSubTasks: StalledSubTaskItem[];
    overdueTasks: DashboardRiskItem[];
    overdueItems?: DashboardRiskItem[];
    unassignedTasks?: DashboardRiskItem[];
    unassignedSubTasks?: DashboardRiskItem[];
    clientHealth?: ClientHealthItem[];
    bottleneckItems: DashboardRiskItem[];
    generatedAt: string;
}

export interface DashboardKpis {
    overdueTaskCount: number;
    overdueSubTaskCount: number;
    averageCycleTimeDays: number | null;
    completionRate: number;
    completedSubTaskCount: number;
    totalSubTaskCount: number;
    bottleneckCount: number;
    atRiskProjectCount: number;
    atRiskSubProjectCount: number;
    availablePersonCount: number;
    unassignedTaskCount?: number;
    unassignedSubTaskCount?: number;
    globalProgressPercentage?: number | null;
    stalledTaskCount?: number;
    stalledSubTaskCount?: number;
}

export interface WorkloadItem {
    userId: string;
    userName: string;
    roleName: string;
    activeTaskCount: number;
    completedTaskCount: number;
    overdueTaskCount: number;
    inReviewTaskCount: number;
    activeSubTaskCount: number;
    completedSubTaskCount: number;
    overdueSubTaskCount: number;
    averageProgressPercentage: number;
    statusCounts: WorkloadStatusCount[];
    tasks: WorkloadTask[];
    subTasks: WorkloadSubTask[];
}

export interface WorkloadStatusCount {
    status: string;
    count: number;
}

export interface WorkloadTask {
    taskId: string;
    subProjectId: string;
    title: string;
    projectTitle: string;
    subProjectTitle: string;
    status: string;
    progressPercentage: number;
    dueDate: string | null;
    daysOverdue: number;
    itemType?: "Task" | "SubTask";
}

export interface ClientHealthItem {
    clientId: string;
    clientName: string;
    representativeUserId: string | null;
    representativeUserName: string | null;
    progressPercentage: number | null;
    activeProjectCount: number;
    overdueTaskCount: number;
    overdueSubTaskCount: number;
    unassignedTaskCount: number;
    unassignedSubTaskCount: number;
    stalledTaskCount: number;
    stalledSubTaskCount: number;
}

export interface ClientHierarchy {
    clientId: string;
    clientName: string;
    representativeUserId: string | null;
    representativeUserName: string | null;
    progressPercentage: number | null;
    projects: ClientHierarchyProject[];
}

export interface ClientHierarchyProject {
    projectId: string;
    title: string;
    progressPercentage: number | null;
    assignedUserId: string | null;
    assignedUserName: string | null;
    subProjects: ClientHierarchySubProject[];
}

export interface ClientHierarchySubProject {
    subProjectId: string;
    title: string;
    departmentId: string | null;
    departmentName: string | null;
    progressPercentage: number | null;
    tasks: ClientHierarchyTask[];
}

export interface ClientHierarchyTask {
    taskId: string;
    title: string;
    status: string;
    progressPercentage: number | null;
    assignedUserId: string | null;
    assignedUserName: string | null;
    subTasks: ClientHierarchySubTask[];
}

export interface ClientHierarchySubTask {
    subTaskId: string;
    title: string;
    status: string;
    progressPercentage: number | null;
    assignedUserId: string | null;
    assignedUserName: string | null;
}

export interface WorkloadSubTask {
    subTaskId: string;
    parentTaskId: string;
    subProjectId: string;
    title: string;
    parentTaskTitle: string;
    status: string;
    dueDate: string | null;
    daysOverdue: number;
}

export interface WorkflowDistributionItem {
    status: string;
    count: number;
    percentage: number;
}

export interface SubProjectHealthItem {
    subProjectId: string;
    title: string;
    projectTitle: string;
    startDate: string;
    endDate: string | null;
    totalTaskCount: number;
    completedTaskCount: number;
    progressPercentage: number;
    isAtRisk: boolean;
}

export interface DashboardTaskItem {
    taskId: string;
    parentTaskId: string;
    subProjectId: string;
    title: string;
    parentTaskTitle: string;
    assignedUserName: string | null;
    status: string;
    dueDate: string;
    daysRemaining: number;
}

export interface StalledTaskItem {
    taskId: string;
    subProjectId: string;
    title: string;
    assignedUserName: string | null;
    status: string;
    daysWithoutChange: number;
    daysOverdue: number;
    lastStatusChangeAt: string;
}

export interface StalledSubTaskItem {
    subTaskId: string;
    parentTaskId: string;
    subProjectId: string;
    title: string;
    parentTaskTitle: string;
    assignedUserName: string | null;
    status: string;
    daysWithoutChange: number;
    daysOverdue: number;
    lastStatusChangeAt: string;
}

export interface DashboardRiskItem {
    itemId: string;
    parentTaskId: string;
    subProjectId: string;
    title: string;
    parentTaskTitle: string;
    subProjectTitle: string;
    projectTitle: string;
    clientCompanyName: string | null;
    assignedUserName: string | null;
    status: string;
    dueDate: string | null;
    daysOverdue: number;
}
