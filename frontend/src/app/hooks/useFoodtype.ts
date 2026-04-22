import { useEffect, useState } from "react";
import { getFoodTypes } from "../api/foodTypeApi";
import type { FoodType, FoodTypeApi } from "../types";

/* ================= TYPE ================= */

interface UseFoodTypeReturn {
  foodTypes: FoodType[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/* ================= HOOK ================= */

export function useFoodType(): UseFoodTypeReturn {
  const [foodTypes, setFoodTypes] = useState<FoodType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFoodTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getFoodTypes();
      
      // Transform API data to UI format
      const transformedData: FoodType[] = response.data.data.map((item: FoodTypeApi) => ({
        id: String(item.id),
        name: item.food_name,
        minTemp: item.min_temp,
        maxTemp: item.max_temp,
        minHumidity: item.min_humi,
        maxHumidity: item.max_humi,
        description: "", // API doesn't provide description
      }));
      
      setFoodTypes(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch food types");
      setFoodTypes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoodTypes();
  }, []);

  return {
    foodTypes,
    loading,
    error,
    refetch: fetchFoodTypes,
  };
}

