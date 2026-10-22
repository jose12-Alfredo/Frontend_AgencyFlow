"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, UsersRound } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";
import { projectAssignmentsService } from "@/services/project-assignments.service";
import { ProjectAssignment, ProjectAssignmentOptions } from "@/types/project-assignment.types";

export default function ProjectAssignmentsPage() {
    const { user } = useAuth();
    const canManage = user?.permissions?.includes("project_assignments.manage") ?? false;
    const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
    const [options, setOptions] = useState<ProjectAssignmentOptions>({ projects: [], users: [] });
    const [projectId, setProjectId] = useState("");
    const [userId, setUserId] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [assignmentResult, optionResult] = await Promise.all([
                projectAssignmentsService.getAll({ page: 1, pageSize: 100 }),
                projectAssignmentsService.getOptions()
            ]);
            setAssignments(assignmentResult.items); setOptions(optionResult);
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : "No se pudieron cargar las asignaciones.");
        } finally { setLoading(false); }
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); }, [load]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); setSaving(true); setError(null);
        try {
            await projectAssignmentsService.create(projectId, userId);
            setUserId(""); await load();
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : "No se pudo crear la asignación.");
        } finally { setSaving(false); }
    }

    async function revoke(assignment: ProjectAssignment) {
        if (!window.confirm(`¿Retirar a ${assignment.userName} del proyecto?`)) return;
        try { await projectAssignmentsService.remove(assignment.id); await load(); }
        catch (cause) { setError(cause instanceof ApiError ? cause.message : "No se pudo retirar la asignación."); }
    }

    return <RequireAuth allowedPermission="project_assignments.view"><AppShell><div className="space-y-6">
        <header><p className="text-sm font-semibold text-blue-700">Colaboración</p><h1 className="mt-1 text-2xl font-bold text-gray-950">Asignaciones de proyectos</h1><p className="mt-2 text-sm text-gray-700">Agrega participantes. Sus permisos determinan si pueden ver, editar o crear contenido.</p></header>
        {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
        {canManage && <form onSubmit={submit} className="grid gap-3 rounded-xl border border-gray-300 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]">
            <select required value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-11 rounded-md border border-gray-400 bg-white px-3 text-sm text-gray-950"><option value="">Seleccionar proyecto</option>{options.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
            <select required value={userId} onChange={(event) => setUserId(event.target.value)} className="h-11 rounded-md border border-gray-400 bg-white px-3 text-sm text-gray-950"><option value="">Seleccionar participante</option>{options.users.map((person) => <option key={person.id} value={person.id}>{person.name}{person.jobPositionName ? ` · ${person.jobPositionName}` : ""}</option>)}</select>
            <button disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"><Plus size={17}/>Asignar</button>
        </form>}
        <section className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-gray-200 p-4"><div className="flex items-center gap-2 font-semibold text-gray-950"><UsersRound size={18}/>Participantes adicionales</div><button onClick={() => void load()} disabled={loading} className="rounded-md border border-gray-300 p-2 text-gray-700 hover:bg-gray-100" aria-label="Actualizar"><RefreshCw size={17} className={loading ? "animate-spin" : ""}/></button></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm text-gray-950"><thead className="bg-gray-100 text-xs font-bold uppercase text-gray-700"><tr><th className="px-5 py-3">Proyecto</th><th className="px-5 py-3">Participante</th><th className="px-5 py-3">Cargo</th><th className="px-5 py-3 text-right">Acción</th></tr></thead><tbody className="divide-y divide-gray-200">{loading ? <tr><td colSpan={4} className="p-8 text-center text-gray-600">Cargando…</td></tr> : assignments.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-gray-600">No hay participantes adicionales.</td></tr> : assignments.map((assignment) => <tr key={assignment.id} className="hover:bg-gray-50"><td className="px-5 py-4 font-semibold">{assignment.projectTitle}</td><td className="px-5 py-4">{assignment.userName}</td><td className="px-5 py-4 text-gray-600">{assignment.jobPositionName ?? "Sin cargo"}</td><td className="px-5 py-4 text-right">{canManage && <button onClick={() => void revoke(assignment)} className="rounded-md p-2 text-red-700 hover:bg-red-100" title="Retirar participante"><Trash2 size={17}/></button>}</td></tr>)}</tbody></table></div>
        </section>
    </div></AppShell></RequireAuth>;
}
