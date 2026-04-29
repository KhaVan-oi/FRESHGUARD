// ================= AREAS =================
import axiosClient from "./axiosClient";

export interface AreaResponse {
  id: number;
  area_name: string;
  warehouse_id: number;
}

/**
 * Lấy danh sách khu vực
 * GET /api/areas
 */
export function getAreas() {
  return axiosClient.get<{ status: string; data: AreaResponse[] }>("/areas");
}
