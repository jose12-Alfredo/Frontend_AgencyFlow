"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Mail, Phone } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { PROJECT_MANAGER_ROLES } from "@/lib/roles";
import { ApiError } from "@/services/api";
import { clientCompaniesService } from "@/services/client-companies.service";
import { projectsService } from "@/services/projects.service";
import { ClientCompany } from "@/types/client-company.types";
import { Project } from "@/types/project.types";

export default function ClientCompanyDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [company, setCompany] = useState<ClientCompany | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [client, result] = await Promise.all([
                clientCompaniesService.getById(id),
                projectsService.getAll({ page: 1, pageSize: 100, clientCompanyId: id })
            ]);
            setCompany(client); setProjects(result.items);
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : "No se pudo cargar el cliente.");
        } finally { setLoading(false); }
    }, [id]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    return <RequireAuth allowedRoles={PROJECT_MANAGER_ROLES}><AppShell>
        <Link href="/client-companies" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"><ArrowLeft size={16} /> Clientes</Link>
        {loading ? <p className="mt-6 text-sm text-gray-500">Cargando cliente…</p> : error || !company ? <section role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error ?? "El cliente no está disponible."}</section> : <div className="mt-6 space-y-6">
            <header className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><Building2 size={21} /></span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Cliente</p><h1 className="mt-1 text-2xl font-semibold text-gray-950">{company.name}</h1><p className="mt-2 text-sm text-gray-600">{company.description || "Sin descripción"}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600"><span className="inline-flex items-center gap-2"><Mail size={15} />{company.email || "Sin correo"}</span><span className="inline-flex items-center gap-2"><Phone size={15} />{company.phone || "Sin teléfono"}</span></div></div></div></header>
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"><header className="border-b border-gray-200 px-5 py-4"><h2 className="font-semibold text-gray-950">Proyectos</h2><p className="mt-1 text-sm text-gray-500">Elige un proyecto para continuar por su jerarquía de trabajo.</p></header>{projects.length === 0 ? <p className="px-5 py-10 text-center text-sm text-gray-500">Este cliente no tiene proyectos visibles.</p> : <div className="divide-y divide-gray-100">{projects.map((project) => <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"><div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-950">{project.title}</p><p className="mt-1 truncate text-xs text-gray-500">{project.detail || project.projectTypeName}</p></div><ArrowRight size={17} className="shrink-0 text-gray-400" /></Link>)}</div>}</section>
        </div>}
    </AppShell></RequireAuth>;
}
