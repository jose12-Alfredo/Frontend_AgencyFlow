import { apiFetch } from "@/services/api";
import {
    LoginRequest,
    LoginResponse
} from "@/types/auth.types";

export function login(
    request: LoginRequest
): Promise<LoginResponse> {
    return apiFetch<LoginResponse>("/api/users/login", {
        method: "POST",
        body: JSON.stringify(request)
    });
}