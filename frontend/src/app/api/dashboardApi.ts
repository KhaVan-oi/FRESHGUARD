import axiosClient from "./axiosClient";
import type {
  DashboardApiResponse,
  FoodTypeApi,
  SensorHistoryRecord,
  DashboardAreaApi,
  LiveSensorDataPayload,
  WarehouseApi,
} from "../types";

// ================= DASHBOARD =================
export function getDashboard() {
  return axiosClient.get<DashboardApiResponse>("/dashboard");
}

// ================= WAREHOUSE =================
export function getWarehouses() {
  return axiosClient.get<{ status: string; data: WarehouseApi[] }>(
    "/warehouses",
  );
}

export function getWarehouse(warehouseId: number | string) {
  return axiosClient.get<{ status: string; data: WarehouseApi }>(
    `/warehouses/${warehouseId}`,
  );
}

// ================= FOOD TYPES =================
export function getFoodTypes() {
  return axiosClient.get<{ status: string; data: FoodTypeApi[] }>(
    "/food-types",
  );
}

// ================= SENSOR HISTORY =================
export function getSensorHistory(params: {
  type: string;
  area_id: number | string;
  limit?: number;
}) {
  return axiosClient
    .get<{
      status: string;
      data: SensorHistoryRecord[];
    }>("/sensors/history", { params })
    .then((res) => res.data.data);
}

// ================= AREA SETTINGS =================
export function updateAreaSettings(
  areaId: number | string,
  body: {
    current_food_type_id: number;
    auto_door_timeout_sec: number;
  },
) {
  return axiosClient.put("/areas/" + areaId + "/settings", body);
}

// ================= DEVICE CONTROL =================
export function controlDevice(body: { device_id: string; action: string }) {
  return axiosClient.post("/devices/control", body);
}
