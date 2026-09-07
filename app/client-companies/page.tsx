"use client";

import {
    useCallback,
    useEffect,
    useState
} from "react";
import {
    Mail,
    Pencil,
    Phone,
    Plus,
    RefreshCw,
    Trash2
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ADMIN_ROLES } from "@/lib/roles";
import { ClientCompanyDeleteDialog } from "@/components/client-companies/ClientCompanyDeleteDialog";
import { ClientCompanyFormModal } from "@/components/client-companies/ClientCompanyFormModal";
import { AppShell } from "@/components/layout/AppShell";
import { ApiError } from "@/services/api";
import { clientCompaniesService } from "@/services/client-companies.service";
import { ClientCompany } from "@/types/client-company.types";

export default function ClientCompaniesPage() {
    const [companies, setCompanies] = useState<ClientCompany[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] =
        useState<ClientCompany | null>(null);
    const [companyToDelete, setCompanyToDelete] =
        useState<ClientCompany | null>(null);

    const loadCompanies = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await clientCompaniesService.getAll({
                page: 1,
                pageSize: 100
            });

            setCompanies(result.items);
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudieron cargar las empresas cliente.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Carga inicial de empresas cliente al abrir la página.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadCompanies();
    }, [loadCompanies]);

    return (
        <RequireAuth allowedRoles={ADMIN_ROLES}>
            <AppShell>
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-blue-600">
                            Clientes
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                            Empresas cliente
                        </h1>

                        <p className="mt-2 text-sm text-gray-600">
                            Organizaciones externas atendidas por la agencia.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedCompany(null);
                                setIsFormOpen(true);
                            }}
                            className="flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700"
                        >
                            <Plus size={18} />
                            Nueva empresa
                        </button>

                        <button
                            type="button"
                            title="Actualizar empresas"
                            aria-label="Actualizar empresas"
                            onClick={() => void loadCompanies()}
                            disabled={isLoading}
                            className="rounded-md border border-gray-300 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={19}
                                className={isLoading ? "animate-spin" : ""}
                            />
                        </button>
                    </div>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] border-collapse text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Empresa
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Contacto
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                                        Descripción
                                    </th>

                                    <th className="w-32 px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            Cargando empresas cliente...
                                        </td>
                                    </tr>
                                ) : companies.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-5 py-10 text-center text-sm text-gray-500"
                                        >
                                            No existen empresas registradas.
                                        </td>
                                    </tr>
                                ) : (
                                    companies.map((company) => (
                                        <tr key={company.id}>
                                            <td className="px-5 py-4 text-sm font-medium text-gray-900">
                                                {company.name}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-gray-600">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <Mail
                                                            size={15}
                                                            className="shrink-0 text-gray-400"
                                                        />
                                                        <span>
                                                            {company.email ||
                                                                "Sin correo"}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Phone
                                                            size={15}
                                                            className="shrink-0 text-gray-400"
                                                        />
                                                        <span>
                                                            {company.phone ||
                                                                "Sin teléfono"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="max-w-md px-5 py-4 text-sm text-gray-600">
                                                {company.description ||
                                                    "Sin descripción"}
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        title="Editar empresa"
                                                        aria-label={`Editar ${company.name}`}
                                                        onClick={() => {
                                                            setSelectedCompany(
                                                                company
                                                            );
                                                            setIsFormOpen(true);
                                                        }}
                                                        className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Eliminar empresa"
                                                        aria-label={`Eliminar ${company.name}`}
                                                        onClick={() =>
                                                            setCompanyToDelete(
                                                                company
                                                            )
                                                        }
                                                        className="rounded-md p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {isFormOpen && (
                    <ClientCompanyFormModal
                        company={selectedCompany}
                        onClose={() => {
                            setIsFormOpen(false);
                            setSelectedCompany(null);
                        }}
                        onSaved={loadCompanies}
                    />
                )}

                {companyToDelete && (
                    <ClientCompanyDeleteDialog
                        company={companyToDelete}
                        onClose={() => setCompanyToDelete(null)}
                        onDeleted={loadCompanies}
                    />
                )}
            </AppShell>
        </RequireAuth>
    );
}
