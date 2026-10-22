"use client";

import {
    FormEvent,
    useState
} from "react";
import {
    Eye,
    EyeOff,
    X
} from "lucide-react";
import { ApiError } from "@/services/api";
import { usersService } from "@/services/users.service";
import { ClientCompany } from "@/types/client-company.types";
import { JobPosition } from "@/types/job-position.types";
import { Role } from "@/types/role.types";
import { User, UserRequest } from "@/types/user.types";

interface UserFormModalProps {
    user: User | null;
    roles: Role[];
    jobPositions: JobPosition[];
    companies: ClientCompany[];
    onClose: () => void;
    onSaved: () => Promise<void>;
    onCreate?: (request: UserRequest) => Promise<unknown>;
    showClientCompany?: boolean;
}

export function UserFormModal({
    user,
    roles,
    jobPositions,
    companies,
    onClose,
    onSaved,
    onCreate,
    showClientCompany = true
}: UserFormModalProps) {
    const [firstName, setFirstName] = useState(user?.firstName ?? "");
    const [lastName, setLastName] = useState(user?.lastName ?? "");
    const [phone, setPhone] = useState(user?.phone ?? "");
    const [email, setEmail] = useState(user?.email ?? "");
    const [password, setPassword] = useState("");
    const [roleId, setRoleId] = useState(user?.roleId ?? "");
    const [jobPositionId, setJobPositionId] = useState(
        user?.jobPositionId ?? ""
    );
    const [clientCompanyId, setClientCompanyId] = useState(
        user?.clientCompanyId ?? ""
    );
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const isEditing = user !== null;
    const selectedRole = roles.find((role) => role.id === roleId);
    const isClient = selectedRole?.name.trim().toLowerCase() === "cliente";

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!firstName.trim() || !lastName.trim()) {
            setError("El nombre y el apellido son obligatorios.");
            return;
        }

        if (!roleId) {
            setError("Debes seleccionar un perfil de acceso.");
            return;
        }

        if (!isClient && !jobPositionId) {
            setError("Debes seleccionar un cargo.");
            return;
        }

        if (password && password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres.");
            return;
        }

        setError(null);
        setIsSaving(true);

        try {
            const request = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phone.trim() || null,
                email: email.trim() || null,
                password: password || null,
                roleId,
                jobPositionId: jobPositionId || null,
                clientCompanyId: clientCompanyId || null
            };

            if (isEditing) {
                await usersService.update(user.id, request);
            } else {
                if (onCreate) await onCreate(request);
                else await usersService.create(request);
            }

            await onSaved();
            onClose();
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.message);
            } else {
                setError("No se pudo guardar el usuario.");
            }
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-form-title"
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6"
        >
            <section className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow-xl">
                <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase text-blue-600">
                            Administración
                        </p>

                        <h2
                            id="user-form-title"
                            className="mt-1 text-lg font-semibold text-gray-900"
                        >
                            {isEditing ? "Editar usuario" : "Nuevo usuario"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        title="Cerrar"
                        aria-label="Cerrar"
                        onClick={onClose}
                        disabled={isSaving}
                        className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="space-y-5 p-6">
                    {error && (
                        <div
                            role="alert"
                            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error}
                        </div>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="user-first-name"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Nombre
                            </label>

                            <input
                                id="user-first-name"
                                type="text"
                                value={firstName}
                                onChange={(event) =>
                                    setFirstName(event.target.value)
                                }
                                autoFocus
                                required
                                maxLength={100}
                                className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="user-last-name"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Apellido
                            </label>

                            <input
                                id="user-last-name"
                                type="text"
                                value={lastName}
                                onChange={(event) =>
                                    setLastName(event.target.value)
                                }
                                required
                                maxLength={100}
                                className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="user-email"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Correo electrónico
                            </label>

                            <input
                                id="user-email"
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                maxLength={200}
                                className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="user-phone"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Teléfono
                            </label>

                            <input
                                id="user-phone"
                                type="tel"
                                value={phone}
                                onChange={(event) =>
                                    setPhone(event.target.value)
                                }
                                maxLength={50}
                                className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="user-password"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            {isEditing
                                ? "Nueva contraseña (opcional)"
                                : "Contraseña (opcional)"}
                        </label>

                        <div className="relative">
                            <input
                                id="user-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                minLength={8}
                                autoComplete="new-password"
                                className="h-11 w-full rounded-md border border-gray-300 px-3 pr-11 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />

                            <button
                                type="button"
                                title={showPassword
                                    ? "Ocultar contraseña"
                                    : "Mostrar contraseña"}
                                aria-label={showPassword
                                    ? "Ocultar contraseña"
                                    : "Mostrar contraseña"}
                                onClick={() => setShowPassword((value) => !value)}
                                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-500 hover:bg-gray-100"
                            >
                                {showPassword
                                    ? <EyeOff size={18} />
                                    : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="user-job-position"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Cargo{isClient ? " (opcional)" : ""}
                            </label>

                            <select
                                id="user-job-position"
                                value={jobPositionId}
                                onChange={(event) =>
                                    setJobPositionId(event.target.value)
                                }
                                required={!isClient}
                                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">Seleccionar cargo</option>
                                {jobPositions.map((jobPosition) => (
                                    <option key={jobPosition.id} value={jobPosition.id}>
                                        {jobPosition.name}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1.5 text-xs text-gray-500">
                                Nombre que verá la persona en el sistema.
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor="user-role"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Perfil de acceso
                            </label>

                            <select
                                id="user-role"
                                value={roleId}
                                onChange={(event) =>
                                    setRoleId(event.target.value)
                                }
                                required
                                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">Seleccionar perfil</option>
                                {roles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1.5 text-xs text-gray-500">
                                Define las funciones base y la seguridad.
                            </p>
                        </div>
                    </div>

                    {showClientCompany && <div>
                        <div>
                            <label
                                htmlFor="user-company"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Empresa cliente
                            </label>

                            <select
                                id="user-company"
                                value={clientCompanyId}
                                onChange={(event) =>
                                    setClientCompanyId(event.target.value)
                                }
                                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">Sin empresa cliente</option>
                                {companies.map((company) => (
                                    <option
                                        key={company.id}
                                        value={company.id}
                                    >
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>}

                    <footer className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={isSaving || roles.length === 0 || (!isClient && jobPositions.length === 0)}
                            className="h-10 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? "Guardando..." : "Guardar usuario"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
