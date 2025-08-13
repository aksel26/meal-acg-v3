import { useState, useCallback } from "react";

export interface UserApplication {
  name: string;
  memo?: string;
  drink: string;
}

export interface PickupPerson {
  name: string;
}

export interface DrinkOption {
  name: string;
  available: boolean;
}

export interface MonthlyData {
  applications: UserApplication[];
  drinkOptions: DrinkOption[];
  pickupPersons: PickupPerson[];
}

interface UseMonthlyDataResult {
  data: MonthlyData | null;
  isLoading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  refetchData: () => Promise<void>;
}

export const useMonthlyData = (): UseMonthlyDataResult => {
  const [data, setData] = useState<MonthlyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/google-sheets/monthly", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch monthly data: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error fetching monthly data:", error);
      setError(error instanceof Error ? error.message : "Failed to load monthly data");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetchData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    fetchData,
    refetchData,
  };
};