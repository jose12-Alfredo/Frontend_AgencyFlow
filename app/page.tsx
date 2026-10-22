"use client";

import { FormEvent, PointerEvent, Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";
import { getRoleHome } from "@/lib/roles";
import { Allura } from "next/font/google";
const allura = Allura({
  weight: "400",
  subsets: ["latin"],
});
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
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8ff] px-4 py-10">
        <p className="text-sm font-medium text-[#536080]">
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

  function handleLogoPointerMove(event: PointerEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    const rectangle = element.getBoundingClientRect();
    const horizontalPosition =
        (event.clientX - rectangle.left) / rectangle.width - 0.5;
    const verticalPosition =
        (event.clientY - rectangle.top) / rectangle.height - 0.5;

    element.style.setProperty("--logo-x", `${horizontalPosition * 18}px`);
    element.style.setProperty("--logo-y", `${verticalPosition * 12}px`);
    element.style.setProperty("--logo-rotate-x", `${verticalPosition * -7}deg`);
    element.style.setProperty("--logo-rotate-y", `${horizontalPosition * 9}deg`);
    element.style.setProperty("--logo-scale", "1.025");
  }

  function handleLogoPointerLeave(event: PointerEvent<HTMLDivElement>) {
    const element = event.currentTarget;

    element.style.setProperty("--logo-x", "0px");
    element.style.setProperty("--logo-y", "0px");
    element.style.setProperty("--logo-rotate-x", "0deg");
    element.style.setProperty("--logo-rotate-y", "0deg");
    element.style.setProperty("--logo-scale", "1");
  }

  return (
      <main className="min-h-dvh bg-[#f7f8ff] lg:grid lg:grid-cols-2">
        <section className="login-panel flex min-h-dvh items-center justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-24">
          <div className="w-full max-w-[510px]">
            <header className="login-header mb-10">
              <div
                  className="login-logo mb-10 h-[135px] overflow-hidden motion-safe:animate-[logoReveal_900ms_cubic-bezier(0.22,1,0.36,1)_both]"
                  style={{ perspective: "900px" }}
                  onPointerMove={handleLogoPointerMove}
                  onPointerLeave={handleLogoPointerLeave}
              >
                <Image
                    src="/images/login/logo-flow.png"
                    alt="C&P Flow — Gestión y control del flujo de trabajo"
                    width={1983}
                    height={793}
                    priority
                    className="h-auto w-full max-w-[500px] transition-[transform,filter] duration-200 ease-out hover:brightness-110 hover:drop-shadow-[0_10px_16px_rgba(95,40,235,0.24)]"
                    style={{
                      transform:
                          "translate3d(var(--logo-x, 0px), calc(-20% + var(--logo-y, 0px)), 0) rotateX(var(--logo-rotate-x, 0deg)) rotateY(var(--logo-rotate-y, 0deg)) scale(var(--logo-scale, 1))",
                    }}
                />
              </div>

              <div className="login-accent mb-7 h-1 w-14 rounded-full bg-gradient-to-r from-[#4922ec] to-[#9b3fe2]" />
              <h1 className="text-4xl font-bold tracking-[-0.035em] text-[#111a3b] sm:text-[2.65rem]">
                Iniciar sesión
              </h1>
              <p className="mt-3 text-base text-[#66718e] sm:text-lg">
                Ingresa tus credenciales para acceder al sistema.
              </p>
            </header>

            <form className="login-form space-y-6" onSubmit={handleSubmit}>
              {error && (
                  <div
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
              )}

              <div>
                <label htmlFor="email" className="mb-2.5 block text-sm font-semibold text-[#111a3b]">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#66718e]" aria-hidden="true" />
                  <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                      className="h-14 w-full rounded-xl border border-[#d7dced] bg-[#fafbff] pl-12 pr-4 text-[#111a3b] outline-none transition placeholder:text-[#98a0b8] focus:border-[#5b2bea] focus:bg-white focus:ring-4 focus:ring-[#5b2bea]/10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2.5 block text-sm font-semibold text-[#111a3b]">
                  Contraseña
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#66718e]" aria-hidden="true" />
                  <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                      minLength={8}
                      className="h-14 w-full rounded-xl border border-[#d7dced] bg-[#fafbff] pl-12 pr-4 text-[#111a3b] outline-none transition placeholder:text-[#98a0b8] focus:border-[#5b2bea] focus:bg-white focus:ring-4 focus:ring-[#5b2bea]/10"
                  />
                </div>
              </div>

              <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#5420ee] to-[#2f2ba5] px-4 text-base font-bold text-white shadow-[0_12px_28px_rgba(76,36,203,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(76,36,203,0.3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5b2bea]/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isSubmitting ? "Verificando..." : "Ingresar"}
                {!isSubmitting && <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
              </button>
            </form>

            <div className="login-footer mt-12 flex items-center gap-4 text-[0.65rem] font-semibold tracking-[0.3em] text-[#8993b1]">
              <span className="h-px flex-1 bg-[#d7dced]" />
              <span>C&amp;P CONSORCIO PUBLICITARIO</span>
              <span className="h-px flex-1 bg-[#d7dced]" />
            </div>
          </div>
        </section>

        <aside className="relative hidden min-h-dvh overflow-hidden bg-[#081127] lg:block">
          <Image
              src="/images/login/building2.png"
              alt="Fachada de C&P Consorcio Publicitario"
              fill
              priority
              sizes="50vw"
              className="object-cover object-right motion-safe:animate-[heroImageReveal_1400ms_cubic-bezier(0.22,1,0.36,1)_both]"
          />

          {/* Oscurece la fotografía para que las letras resalten */}
          <div className="absolute inset-0 bg-[#020817]/2" />
          {/* ESQUINA SUPERIOR IZQUIERDA - franja violeta clara */}
          <div
              aria-hidden="true"
              className="
    pointer-events-none
    absolute left-0 top-0 z-[1]
    h-[31%] w-[14%]
    bg-gradient-to-b
    from-[#7C4FE0]
    via-[#6C3FD0]
    to-[#4E2A9F]
    [clip-path:polygon(0_0,52%_0,0_100%)]
    motion-safe:animate-[cornerTopReveal_900ms_cubic-bezier(0.22,1,0.36,1)_150ms_both]
  "
          />

          {/* ESQUINA SUPERIOR IZQUIERDA - franja azul/violeta oscura */}
          <div
              aria-hidden="true"
              className="
    pointer-events-none
    absolute left-0 top-0 z-[1]
    h-[38%] w-[23%]
    bg-gradient-to-b
    from-[#2B376B]/90
    via-[#30356E]/88
    to-[#252657]/85
    [clip-path:polygon(24%_0,68%_0,0_100%,0_56%)]
    motion-safe:animate-[cornerTopReveal_1000ms_cubic-bezier(0.22,1,0.36,1)_250ms_both]
  "
          />

          {/* ESQUINA INFERIOR DERECHA */}
          <div
              aria-hidden="true"
              className="
    pointer-events-none
    absolute bottom-0 right-0 z-[1]
    h-[24%] w-[51%]
    bg-gradient-to-br
    from-[#5933B8]/85
    via-[#43239B]/92
    to-[#241257]/96
    [clip-path:polygon(100%_0,100%_100%,0_100%)]
    motion-safe:animate-[cornerBottomReveal_1100ms_cubic-bezier(0.22,1,0.36,1)_300ms_both]
  "
          />


          {/* Texto colocado delante de la fotografía */}
          <div className="absolute left-[7%] top-[48%] z-10">
            <h2 className="text-[clamp(1.8rem,2.25vw,2.55rem)] font-extrabold leading-[0.98] tracking-[-0.035em]">
    <span className="block text-white motion-safe:animate-[heroCopyReveal_700ms_cubic-bezier(0.22,1,0.36,1)_250ms_both]">
      Proyectos
      <br />
      que avanzan,
    </span>

              <span className="block text-[#8037ff] motion-safe:animate-[heroCopyReveal_700ms_cubic-bezier(0.22,1,0.36,1)_430ms_both]">
      resultados
      <br />
      que inspiran.
    </span>
            </h2>

            <div className="mt-6 h-1 w-14 origin-left rounded-full bg-[#a33cff] motion-safe:animate-[accentLineReveal_600ms_cubic-bezier(0.22,1,0.36,1)_620ms_both]" />

            <p className="mt-5 max-w-[320px] text-[clamp(0.95rem,1vw,1.1rem)] leading-[1.45] text-white/90 motion-safe:animate-[heroCopyReveal_700ms_cubic-bezier(0.22,1,0.36,1)_760ms_both]">
              Gestión y control del flujo de trabajo
              <span className="block">
      para un equipo más conectado
    </span>
              <span className="block">
      y productivo.
    </span>
            </p>
          </div>
          <div
              className={`${allura.className} absolute bottom-[4%] right-[5%] z-10 -rotate-[8deg] text-center text-[clamp(2rem,3vw,2.3rem)] leading-[0.85] text-white/85 motion-safe:animate-[signatureReveal_800ms_cubic-bezier(0.22,1,0.36,1)_900ms_both]`}
          >
            Ideas
            <span className="block">que conectan</span>
          </div>
        </aside>
      </main>
  );
}
