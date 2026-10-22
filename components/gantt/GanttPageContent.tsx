"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GanttEndpointPending } from "@/components/gantt/GanttEndpointPending";
import { GanttTimeline, type GanttContent } from "@/components/gantt/GanttTimeline";
import { ApiError } from "@/services/api";
import { ganttService } from "@/services/gantt.service";
import { projectsService } from "@/services/projects.service";
import { subProjectsService } from "@/services/subprojects.service";
import type { GanttNode } from "@/types/gantt.types";

type Scope = "project" | "subproject";
type PageContent = GanttContent | { state: "pending" };

function detailHref(node: GanttNode, ancestors: GanttNode[]): string {
    const id = encodeURIComponent(node.id);
    if (node.type === "project") return `/projects/${id}`;
    if (node.type === "subproject") return `/subprojects/${id}`;

    const subproject = ancestors.find((item) => item.type === "subproject");
    const task = node.type === "task" ? node : ancestors.find((item) => item.type === "task");
    const query = new URLSearchParams();
    if (subproject) query.set("subProjectId", subproject.id);
    if (task) query.set("taskId", task.id);
    return `/subtasks?${query.toString()}`;
}

export function GanttPageContent({ id, scope }: { id: string; scope: Scope }) {
    const router = useRouter();
    const [attempt, setAttempt] = useState(0);
    const [content, setContent] = useState<PageContent>({ state: "loading" });

    useEffect(() => {
        let active = true;

        async function load() {
            setContent({ state: "loading" });
            try {
                const root = scope === "project" ? await ganttService.getProject(id) : await ganttService.getSubProject(id);
                if (!active) return;
                if (root.type !== scope || root.id.toLowerCase() !== id.toLowerCase() || !Array.isArray(root.children)) {
                    setContent({ state: "error", message: "La API devolvió un árbol Gantt no válido para este detalle.", onRetry: () => setAttempt((value) => value + 1) });
                    return;
                }
                setContent(root.children.length === 0 ? { state: "empty" } : { state: "ready", root });
            } catch (cause) {
                if (!active) return;
                if (cause instanceof ApiError && (cause.status === 404 || cause.status === 501)) {
                    try {
                        // A valid detail with a missing Gantt route means the contracted endpoint is not published yet.
                        if (scope === "project") await projectsService.getById(id);
                        else await subProjectsService.getById(id);
                        if (active) setContent({ state: "pending" });
                        return;
                    } catch (detailCause) {
                        cause = detailCause;
                    }
                }
                if (active) setContent({ state: "error", message: cause instanceof Error ? cause.message : "No se pudo cargar el Gantt.", onRetry: () => setAttempt((value) => value + 1) });
            }
        }

        void load();
        return () => { active = false; };
    }, [attempt, id, scope]);

    if (content.state === "pending") return <GanttEndpointPending scope={scope === "project" ? "proyecto" : "subproyecto"} />;

    return <GanttTimeline content={content} onSelectNode={(node, ancestors) => router.push(detailHref(node, ancestors))} />;
}
