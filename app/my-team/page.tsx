"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Crown, Plus, RefreshCw, UsersRound } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { DirectorTeamMemberDialog as DirectorTeamMemberFormModal } from "@/components/director/DirectorTeamMemberDialog";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";
import { departmentUsersService } from "@/services/department-users.service";
import { directorTeamService } from "@/services/director-team.service";
import { loadAllPages } from "@/services/pagination";
import { DepartmentUser } from "@/types/department-user.types";
import { Role } from "@/types/role.types";

export default function MyTeamPage() {
    const { user } = useAuth();
    const userId = user?.id;
    const [members, setMembers] = useState<DepartmentUser[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [directedDepartments, setDirectedDepartments] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
    const [department, setDepartment] = useState<{ id: string; name: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true); setError(null);
        try {
            const own = await loadAllPages((page, pageSize) =>
                departmentUsersService.getAll({ page, pageSize, userId, isDirector: true })
            );
            const nextDepartments = Array.from(new Map(
                own.map((membership) => [membership.departmentId, {
                    id: membership.departmentId,
                    name: membership.departmentName
                }])
            ).values());
            const selected = nextDepartments.find((item) => item.id === selectedDepartmentId) ?? nextDepartments[0];
            setDirectedDepartments(nextDepartments);
            if (!selected) { setDepartment(null); setMembers([]); return; }
            const [team, roleResult] = await Promise.all([
                loadAllPages((page, pageSize) =>
                    departmentUsersService.getAll({ page, pageSize, departmentId: selected.id })
                ),
                directorTeamService.getAllowedRoles()
            ]);
            setSelectedDepartmentId(selected.id);
            setDepartment(selected);
            setMembers(team); setRoles(roleResult);
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : "No se pudo cargar tu equipo.");
        } finally { setLoading(false); }
    }, [selectedDepartmentId, userId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); }, [load]);

    const directors = useMemo(() => members.filter((member) => member.isDirector || member.userId === userId), [members, userId]);
    const team = useMemo(() => members.filter((member) => !directors.some((director) => director.id === member.id)), [directors, members]);

    return <RequireAuth allowedRoles={["Director"]}><AppShell><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-blue-600">Dirección de área</p><h1 className="mt-1 text-2xl font-semibold text-gray-900">Mi equipo</h1><p className="mt-2 text-sm text-gray-600">Selecciona uno de los departamentos que diriges.</p>{directedDepartments.length > 1 && <label className="mt-4 block max-w-sm text-sm font-semibold text-gray-700">Departamento<select value={selectedDepartmentId} onChange={(event) => setSelectedDepartmentId(event.target.value)} className="mt-1.5 block h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900">{directedDepartments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}</div><button onClick={() => void load()} className="rounded-md border border-gray-300 bg-white p-2.5 text-gray-600"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button></header>{error && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{loading ? <p className="mt-8 text-sm text-gray-500">Cargando equipo…</p> : !department ? <p className="mt-8 rounded-xl border bg-white p-6 text-sm text-gray-500">No tienes un departamento dirigido disponible.</p> : <section className="mt-6 max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"><header className="flex items-center justify-between gap-4 border-b px-5 py-4"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><UsersRound size={20} /></span><div><h2 className="font-semibold text-gray-900">{department.name}</h2><p className="text-xs text-gray-500">{members.length} integrantes</p></div></div><button onClick={() => setCreating(true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white"><Plus size={17} />Crear integrante</button></header><div className="divide-y">{[...directors, ...team].map((member) => <div key={member.id} className="flex items-center gap-3 px-5 py-4"><span className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">{member.userFirstName.slice(0, 1)}{member.userLastName.slice(0, 1)}</span><div className="min-w-0 flex-1"><p className="font-medium text-gray-900">{member.userFirstName} {member.userLastName}</p><p className="text-xs text-gray-500">{member.userRoleName || "Integrante del departamento"}</p></div>{directors.some((director) => director.id === member.id) && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800"><Crown size={13} />Director</span>}</div>)}</div></section>}{creating && department && <DirectorTeamMemberFormModal departmentId={department.id} departmentName={department.name} roles={roles} onClose={() => setCreating(false)} onSaved={load} />}</AppShell></RequireAuth>;
}
