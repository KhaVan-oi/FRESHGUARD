import { useEffect, useState } from "react";
import { getAreas, type AreaResponse } from "../api/areaApi";

interface UseAreaReturn {
  areas: AreaResponse[];
  loading: boolean;
  error: string | null;
}

export function useArea(): UseAreaReturn {
  const [areas, setAreas] = useState<AreaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getAreas();
        setAreas(response.data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch areas");
        setAreas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAreas();
  }, []);

  return {
    areas,
    loading,
    error,
  };
}
