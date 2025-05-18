import { useMemo } from "react";

export function useFormattedDate(dateInput: any): string {
  return useMemo(() => {
    let dateObj;
    if (
      typeof dateInput === "object" &&
      dateInput !== null &&
      typeof dateInput.toDate === "function"
    ) {
      dateObj = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else if (typeof dateInput === "string" || typeof dateInput === "number") {
      dateObj = new Date(dateInput);
    } else {
      return String(dateInput);
    }
    return dateObj.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).replace(",", "");
  }, [dateInput]);
}