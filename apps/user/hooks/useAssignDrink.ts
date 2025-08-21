import { useState, useCallback } from "react";

interface AssignDrinkRequest {
  name: string;
  drink: string;
}

interface AssignDrinkResult {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  assignDrink: (name: string, drink: string) => Promise<boolean>;
}

export const useAssignDrink = (): AssignDrinkResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const assignDrink = useCallback(async (name: string, drink: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/google-sheets/monthly/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, drink }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      setSuccess(true);
      return true;
    } catch (error) {
      console.error("Error assigning drink:", error);
      setError(error instanceof Error ? error.message : "Failed to assign drink");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    success,
    assignDrink,
  };
};