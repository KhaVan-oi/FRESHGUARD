// ================= USERS =================
import axiosClient from "./axiosClient";
import type { User } from "../types";

interface UserResponse {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

interface CreateUserPayload {
  username: string;
  password: string;
  full_name: string;
  role: "ADMIN" | "OPERATOR";
}

interface UpdateUserPayload {
  full_name?: string;
  role?: "ADMIN" | "OPERATOR";
}

// Transform UI field names to backend field names
function transformCreateToBackend(data: Partial<CreateUserPayload>) {
  return {
    username: data.username,
    password: data.password,
    full_name: data.full_name,
    role: data.role || "OPERATOR",
  };
}

function transformUpdateToBackend(data: Partial<UpdateUserPayload>) {
  return {
    full_name: data.full_name,
    role: data.role,
  };
}

/**
 * Lấy danh sách tài khoản
 * GET /api/users
 */
export function getUsers() {
  return axiosClient.get<{ status: string; data: UserResponse[] }>("/users");
}

/**
 * Tạo tài khoản mới
 * POST /api/users
 */
export function createUser(body: CreateUserPayload) {
  return axiosClient.post<{ status: string; data: UserResponse }>(
    "/users",
    transformCreateToBackend(body),
  );
}

/**
 * Sửa thông tin tài khoản (Profile)
 * PUT /api/users/profile/:id
 */
export function updateUserProfile(
  id: number,
  body: Partial<UpdateUserPayload>,
) {
  return axiosClient.put<{ status: string; message: string }>(
    `/users/profile/${id}`,
    transformUpdateToBackend(body),
  );
}

/**
 * Update khu vực quản lý cho Operator
 * PUT /api/users/:id/managed-areas
 */
export function updateUserManagedAreas(id: number, areaIds: number[]) {
  return axiosClient.put<{ status: string; message: string }>(
    `/users/${id}/managed-areas`,
    { area_ids: areaIds },
  );
}
