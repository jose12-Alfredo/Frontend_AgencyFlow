"use client";

import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState
} from "react";
import { login as loginRequest } from "@/services/auth.service";
import {
    AUTH_TOKEN_KEY,
    AUTH_USER_KEY,
    isTokenExpired
} from "@/services/api";
import {
    AuthUser,
    LoginRequest
} from "@/types/auth.types";

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (request: LoginRequest) => Promise<AuthUser>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(
    undefined
);

export function AuthProvider({
                                 children
                             }: {
    children: ReactNode;
}) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        /*
         * Restaurar la sesión desde localStorage al cargar la aplicación
         * requiere actualizar intencionalmente el estado.
         */
        /* eslint-disable react-hooks/set-state-in-effect */

        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        const storedUser = localStorage.getItem(AUTH_USER_KEY);

        if (token && storedUser && !isTokenExpired(token)) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem(AUTH_TOKEN_KEY);
                localStorage.removeItem(AUTH_USER_KEY);
            }
        } else {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
        }

        setIsLoading(false);

        /* eslint-enable react-hooks/set-state-in-effect */
    }, []);

    async function login(
        request: LoginRequest
    ): Promise<AuthUser> {
        const response = await loginRequest(request);

        const authenticatedUser: AuthUser = {
            id: response.id,
            firstName: response.firstName,
            lastName: response.lastName,
            email: response.email,
            roleName: response.roleName,
            departments: response.departments
        };

        localStorage.setItem(
            AUTH_TOKEN_KEY,
            response.token
        );

        localStorage.setItem(
            AUTH_USER_KEY,
            JSON.stringify(authenticatedUser)
        );

        setUser(authenticatedUser);

        return authenticatedUser;
    }

    function logout(): void {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        setUser(null);
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: user !== null,
                isLoading,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error(
            "useAuth debe utilizarse dentro de AuthProvider."
        );
    }

    return context;
}
