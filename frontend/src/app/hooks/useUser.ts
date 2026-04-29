import { useEffect, useState } from "react";
import { getUsers } from "../api/userApi";
import type { User } from "../types";

interface UseUserReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUser(): UseUserReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUsers();

      // Transform API data to UI format
      const transformedData: User[] = response.data.data.map((item: any) => ({
        id: String(item.id),
        username: item.username,
        password: "", // Don't expose password on UI
        fullName: item.full_name,
        email: item.email || "",
        role: item.role === "ADMIN" ? "Admin" : "Operator",
        createdAt: new Date(),
      }));

      setUsers(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
}
