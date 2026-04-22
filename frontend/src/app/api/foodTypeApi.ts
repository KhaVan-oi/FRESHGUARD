// ================= FOOD TYPES =================
import axiosClient from "./axiosClient";
import type {
  FoodTypeApi,
  FoodType,
} from "../types";

// Transform UI field names to backend field names
function transformToBackendFormat(data: Partial<FoodType>) {
  return {
    food_name: data.name,
    min_temp: data.minTemp,
    max_temp: data.maxTemp,
    min_humi: data.minHumidity,
    max_humi: data.maxHumidity,
  };
}

export function getFoodTypes() {
  return axiosClient.get<{ status: string; data: FoodTypeApi[] }>(
    "/food-types",
  );
}

export function createFoodType(body: Partial<FoodType>) {
  return axiosClient.post<{ status: string; data: FoodTypeApi }>(
    "/food-types",
    transformToBackendFormat(body),
  );
}

export function updateFoodType(id: number, body: Partial<FoodType>) {
  return axiosClient.put<{ status: string; message: string }>(
    `/food-types/${id}`,
    transformToBackendFormat(body),
  );
}

export function deleteFoodType(id: number) {
  return axiosClient.delete<{ status: string; message: string }>(
    `/food-types/${id}`,
  );
}