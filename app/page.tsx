"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";
import { getRoleHome } from "@/lib/roles";

function getDefaultRoute(roleName: string): string {
  return getRoleHome(roleName);
}

function getPostLoginRoute(
    roleName: string,
    returnTo: string | null
): string {
  if (roleName !== "Gerente" && roleName !== "SuperUsuario" && returnTo?.startsWith("/dashboard")) {
    return getDefaultRoute(roleName);
  }

  return returnTo || getDefaultRoute(roleName);
}

export default function LoginPage() {
  return (
      <Suspense fallback={<LoginPageFallback />}>
        <LoginPageContent />
      </Suspense>
  );
}

function LoginPageFallback() {
  return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
        <p className="text-sm font-medium text-gray-600">
          Cargando inicio de sesión...
        </p>
      </main>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    login,
    isAuthenticated,
    isLoading,
    user
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getPostLoginRoute(user!.roleName, searchParams.get("returnTo")));
    }
  }, [isAuthenticated, isLoading, router, searchParams, user]);

  async function handleSubmit(
      event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const authenticatedUser = await login({
        email,
        password
      });

      router.replace(getPostLoginRoute(authenticatedUser.roleName, searchParams.get("returnTo")));
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError("No se pudo iniciar sesión.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
        <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <header className="mb-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-900 text-sm font-bold text-white">
                AF
              </div>

              <span className="text-xl font-semibold text-gray-900">
                            AgencyFlow
                        </span>
            </div>

            <h1 className="text-2xl font-semibold text-gray-900">
              Iniciar sesión
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </header>

          <form
              className="space-y-5"
              onSubmit={handleSubmit}
          >
            {error && (
                <div
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
            )}

            <div>
              <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-700"
              >
                Correo electrónico
              </label>

              <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                      setEmail(event.target.value)
                  }
                  autoComplete="email"
                  required
                  className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-700"
              >
                Contraseña
              </label>

              <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                      setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  required
                  minLength={8}
                  className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-11 w-full items-center justify-center rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                  ? "Verificando..."
                  : "Ingresar"}
            </button>
          </form>
        </section>
      </main>
  );
}
