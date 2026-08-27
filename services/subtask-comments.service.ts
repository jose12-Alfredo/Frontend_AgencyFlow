import { apiFetch } from "@/services/api";
import { SubTaskComment } from "@/types/subtask-comment.types";

function getBasePath(subTaskId: string): string {
    return `/api/subtasks/${subTaskId}/comments`;
}

export const subTaskCommentsService = {
    getAll(subTaskId: string): Promise<SubTaskComment[]> {
        return apiFetch<SubTaskComment[]>(getBasePath(subTaskId));
    },

    create(subTaskId: string, content: string): Promise<SubTaskComment> {
        return apiFetch<SubTaskComment>(getBasePath(subTaskId), {
            method: "POST",
            body: JSON.stringify({ content })
        });
    },

    remove(subTaskId: string, commentId: string): Promise<void> {
        return apiFetch<void>(
            `${getBasePath(subTaskId)}/${commentId}`,
            { method: "DELETE" }
        );
    }
};
