export function formatDate(dateInput: any): string {
  let dateObj;
  if (dateInput?.toDate) {
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
}