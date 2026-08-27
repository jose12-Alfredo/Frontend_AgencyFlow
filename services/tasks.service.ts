import {
    apiFetch,
    buildQuery
} from "@/services/api";
import { PagedResult } from "@/types/common.types";
import {
    TaskItem,
    TaskItemRequest
} from "@/types/task.types";

interface TaskListParams {
    page?: number;
    pageSize?: number;
    titulo?: string;
    clientCompanyId?: string;
    projectId?: string;
    subProjectId?: string;
    status?: string;
    assignedUserId?: string;

    [key: string]:
        | string
        | number
        | boolean
        | undefined
        | null;
}

const BASE_PATH = "/api/tasks";

export const tasksService = {
    getAll(
        params: TaskListParams = {}
    ): Promise<PagedResult<TaskItem>> {
        const query = buildQuery(params);

        return apiFetch<PagedResult<TaskItem>>(
            `${BASE_PATH}${query}`
        );
    },

    getById(id: string): Promise<TaskItem> {
        return apiFetch<TaskItem>(`${BASE_PATH}/${id}`);
    },

    create(request: TaskItemRequest): Promise<TaskItem> {
        return apiFetch<TaskItem>(BASE_PATH, {
            method: "POST",
            body: JSON.stringify(request)
        });
    },

    update(
        id: string,
        request: TaskItemRequest
    ): Promise<TaskItem> {
        return apiFetch<TaskItem>(`${BASE_PATH}/${id}`, {
            method: "PUT",
            body: JSON.stringify(request)
        });
    },

    updateAssignee(
        id: string,
        assignedUserId: string | null
    ): Promise<TaskItem> {
        return apiFetch<TaskItem>(`${BASE_PATH}/${id}/assignee`, {
            method: "PATCH",
            body: JSON.stringify({ assignedUserId })
        });
    },

    remove(id: string): Promise<void> {
        return apiFetch<void>(`${BASE_PATH}/${id}`, {
            method: "DELETE"
        });
    }
};
