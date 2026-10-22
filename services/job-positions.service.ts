import { apiFetch, buildQuery } from "@/services/api";
import { PagedResult } from "@/types/common.types";
import {
    JobPosition,
    JobPositionRequest
} from "@/types/job-position.types";

interface JobPositionListParams {
    page?: number;
    pageSize?: number;
    nombre?: string;

    [key: string]: string | number | boolean | undefined | null;
}

const BASE_PATH = "/api/job-positions";

export const jobPositionsService = {
    getAll(params: JobPositionListParams = {}): Promise<PagedResult<JobPosition>> {
        return apiFetch<PagedResult<JobPosition>>(
            `${BASE_PATH}${buildQuery(params)}`
        );
    },

    getById(id: string): Promise<JobPosition> {
        return apiFetch<JobPosition>(`${BASE_PATH}/${id}`);
    },

    create(request: JobPositionRequest): Promise<JobPosition> {
        return apiFetch<JobPosition>(BASE_PATH, {
            method: "POST",
            body: JSON.stringify(request)
        });
    },

    update(id: string, request: JobPositionRequest): Promise<JobPosition> {
        return apiFetch<JobPosition>(`${BASE_PATH}/${id}`, {
            method: "PUT",
            body: JSON.stringify(request)
        });
    },

    remove(id: string): Promise<void> {
        return apiFetch<void>(`${BASE_PATH}/${id}`, { method: "DELETE" });
    }
};
