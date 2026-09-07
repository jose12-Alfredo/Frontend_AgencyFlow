import { apiFetch, buildQuery } from "@/services/api";
import { DelayReport, DelayReportQuery } from "@/types/productivity.types";

export const productivityService = {
    getCycleTimes(query: DelayReportQuery = {}): Promise<DelayReport> {
        return apiFetch<DelayReport>(`/api/productivity/cycle-times${buildQuery({
            projectId: query.projectId,
            subProjectId: query.subProjectId,
            responsibleUserId: query.responsibleUserId,
            level: query.level,
            dateFrom: query.dateFrom,
            dateTo: query.dateTo,
            onlyDelayed: query.onlyDelayed
        })}`);
    }
};
