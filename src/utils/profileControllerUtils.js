const getProfileQuery = (user) =>
  user.userId ? { userId: user.userId } : { mobile: user.mobile };

const normalizeComparableText = (value) =>
  value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const extractOptionValue = (value) => {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const candidate = value.value ?? value.label ?? value.name;
    return typeof candidate === "string" ? candidate.trim() : null;
  }

  return null;
};

const normalizeOption = (value, options) => {
  const candidateValue = extractOptionValue(value);
  if (!candidateValue) return null;
  const comparableCandidate = normalizeComparableText(candidateValue);

  return options.find(
    (option) => normalizeComparableText(option) === comparableCandidate
  );
};

const normalizeSelectedOptions = (values, options) => {
  const inputValues = Array.isArray(values)
    ? values
    : typeof values === "string"
      ? values
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : values && typeof values === "object"
        ? [values]
        : [];

  return [
    ...new Set(
      inputValues
        .map((value) => normalizeOption(value, options))
        .filter(Boolean)
    ),
  ];
};

const normalizeText = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeWebsite = (value) => {
  const text = normalizeText(value);
  if (!text) return null;

  if (/^https?:\/\//i.test(text)) {
    return text;
  }

  return `https://${text}`;
};

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch (error) {
    return false;
  }
};

const getSelectedValue = (body, keys) => {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) {
      return body[key];
    }
  }

  return undefined;
};

const mergeNestedProfileBody = (body, nestedKeys) =>
  nestedKeys.reduce(
    (payload, key) => ({
      ...payload,
      ...(body[key] && typeof body[key] === "object" ? body[key] : {}),
    }),
    { ...body }
  );

const applyProfileData = (profile, profileData) => {
  for (const [key, value] of Object.entries(profileData)) {
    if (value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0)) {
      profile[key] = value;
    }
  }
};

export {
  applyProfileData,
  getProfileQuery,
  getSelectedValue,
  isValidUrl,
  mergeNestedProfileBody,
  normalizeOption,
  normalizeSelectedOptions,
  normalizeText,
  normalizeWebsite,
};
