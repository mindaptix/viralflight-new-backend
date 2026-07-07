export const normalizeMobile = (value) => {
  if (!value) return null;

  const raw = String(value).trim();
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (raw.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
};
