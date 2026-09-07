const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const AUTH_TOKEN_KEY = "agencyflow_token";
export const AUTH_USER_KEY = "agencyflow_user";

export function isTokenExpired(token: string): boolean {
    try {
        const payloadPart = token.split(".")[1];

        if (!payloadPart) {
            return true;
        }

        const normalized = payloadPart
            .replace(/-/g, "+")
            .replace(/_/g, "/");
        const payload = JSON.parse(atob(normalized));

        return (
            typeof payload.exp !== "number" ||
            payload.exp * 1000 <= Date.now()
        );
    } catch {
        return true;
    }
}

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

function getToken(): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    return localStorage.getItem(AUTH_TOKEN_KEY);
}
export function buildQuery(
    params: Record<
        string,
        string | number | boolean | undefined | null
    >
): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {
            return;
        }

        searchParams.set(key, String(value));
    });

    const query = searchParams.toString();

    return query ? `?${query}` : "";
}
export async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    if (!API_URL) {
        throw new Error("No se configuró NEXT_PUBLIC_API_URL.");
    }

    const headers = new Headers(options.headers);

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const token = getToken();

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;

    try {
        response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
    } catch {
        throw new ApiError(
            0,
            "No se pudo conectar con el backend."
        );
    }

    if (!response.ok) {
        if (
            response.status === 401 &&
            token &&
            typeof window !== "undefined"
        ) {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            const returnTo = `${window.location.pathname}${window.location.search}`;
            window.location.replace(`/?returnTo=${encodeURIComponent(returnTo)}`);
        }

        let message = `Error HTTP ${response.status}`;

        try {
            const body = await response.json();

            if (body.message) {
                message = body.message;
            } else if (body.title) {
                message = body.title;
            }
        } catch {
            // La respuesta no contenía JSON.
        }

        if (message === `Error HTTP ${response.status}`) {
            message = response.status === 400
                ? "La solicitud no es vÃ¡lida o el cambio de estado no estÃ¡ permitido."
                : response.status === 403
                ? "No tienes permiso para realizar esta acción."
                : response.status === 404
                    ? "El recurso solicitado no existe o ya no está disponible."
                    : response.status === 409
                        ? "La operación entra en conflicto con el estado actual."
                        : message;
        }

        throw new ApiError(response.status, message);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}
