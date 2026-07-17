export const normalizeText = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const toStringList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item.trim() : String(item ?? "").trim()
      )
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const normalizeLinks = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      typeof item === "string" ? item.trim() : String(item ?? "").trim()
    )
    .filter(Boolean);
};

export const normalizeBudgetAmount = (value) => {
  if (value === undefined || value === null || value === "") return 0;

  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

export const normalizeDate = (value) => {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
