import { apiFetch, buildQuery } from "@/services/api";
import { PagedResult } from "@/types/common.types";
import { SubTask, SubTaskRequest } from "@/types/subtask.types";

interface SubTaskListParams {
    page?: number;
    pageSize?: number;
    titulo?: string;
    taskItemId?: string;
    status?: string;
    assignedUserId?: string;

    [key: string]: string | number | boolean | undefined | null;
}

const BASE_PATH = "/api/subtasks";

export const subTasksService = {
    getAll(
        params: SubTaskListParams = {}
    ): Promise<PagedResult<SubTask>> {
        const query = buildQuery(params);
        return apiFetch<PagedResult<SubTask>>(`${BASE_PATH}${query}`);
    },

    getById(id: string): Promise<SubTask> {
        return apiFetch<SubTask>(`${BASE_PATH}/${id}`);
    },

    create(request: SubTaskRequest): Promise<SubTask> {
        return apiFetch<SubTask>(BASE_PATH, {
            method: "POST",
            body: JSON.stringify(request)
        });
    },

    update(id: string, request: SubTaskRequest): Promise<SubTask> {
        return apiFetch<SubTask>(`${BASE_PATH}/${id}`, {
            method: "PUT",
            body: JSON.stringify(request)
        });
    },

    updateStatus(id: string, status: string): Promise<SubTask> {
        return apiFetch<SubTask>(`${BASE_PATH}/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });
    },

    updateAssignee(
        id: string,
        assignedUserId: string | null
    ): Promise<SubTask> {
        return apiFetch<SubTask>(`${BASE_PATH}/${id}/assignee`, {
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
