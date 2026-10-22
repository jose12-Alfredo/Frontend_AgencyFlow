"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { GanttPageContent } from "@/components/gantt/GanttPageContent";
import { AppShell } from "@/components/layout/AppShell";
import { PROJECT_MANAGER_ROLES } from "@/lib/roles";

export default function SubProjectGanttPage() {
    const { id } = useParams<{ id: string }>();

    return <RequireAuth allowedRoles={PROJECT_MANAGER_ROLES}><AppShell>
        <Link href={`/subprojects/${id}`} className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 transition hover:text-blue-900"><ArrowLeft size={16} /> Volver al subproyecto</Link>
        <div className="mt-6"><GanttPageContent key={id} id={id} scope="subproject" /></div>
    </AppShell></RequireAuth>;
}
