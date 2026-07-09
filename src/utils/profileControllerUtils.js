const getProfileQuery = (user) => {
  if (user.userId && user.mobile) {
    return { $or: [{ userId: user.userId }, { mobile: user.mobile }] };
  }

  if (user.userId) {
    return { userId: user.userId };
  }

  if (user.mobile) {
    return { mobile: user.mobile };
  }

  return {};
};

const getOrCreateRoleProfile = async (user, Model) => {
  let profile = await Model.findOne(getProfileQuery(user));

  if (!profile) {
    try {
      profile = await Model.create({
        userId: user.userId,
        mobile: user.mobile,
      });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      profile = await Model.findOne({ mobile: user.mobile });
    }
  }

  if (!profile) {
    throw new Error("Unable to create or find profile");
  }

  if (user.userId) {
    profile.userId = user.userId;
  }

  if (user.mobile) {
    profile.mobile = user.mobile;
  }

  if (profile.isModified()) {
    await profile.save();
  }

  return profile;
};

const normalizeComparableText = (value) =>
  value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/_/g, " ")
    .replace(/&/g, "and")
    .replace(/[^\w\s/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractOptionValue = (value) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (value && typeof value === "object") {
    const candidate =
      value.value ??
      value.label ??
      value.name ??
      value.title ??
      value.text ??
      value.key ??
      value.id;
    return typeof candidate === "string" || typeof candidate === "number"
      ? String(candidate).trim()
      : null;
  }

  return null;
};

const matchOption = (candidateValue, options) => {
  if (candidateValue === undefined || candidateValue === null || candidateValue === "") {
    return null;
  }

  if (typeof candidateValue === "number" && Number.isInteger(candidateValue)) {
    if (options[candidateValue] !== undefined) {
      return options[candidateValue];
    }
  }

  const comparableCandidate = normalizeComparableText(String(candidateValue));
  if (!comparableCandidate) return null;

  const compactCandidate = comparableCandidate.replace(/[\s/-]+/g, "");

  const exactMatch = options.find(
    (option) => normalizeComparableText(option) === comparableCandidate
  );
  if (exactMatch) return exactMatch;

  return (
    options.find((option) => {
      const comparableOption = normalizeComparableText(option);
      const compactOption = comparableOption.replace(/[\s/-]+/g, "");

      return (
        compactOption === compactCandidate ||
        comparableOption.includes(comparableCandidate) ||
        comparableCandidate.includes(comparableOption)
      );
    }) || null
  );
};

const normalizeOption = (value, options) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidates = [
      value.label,
      value.name,
      value.title,
      value.text,
      value.value,
      value.key,
      value.id,
      value.type,
      value.code,
    ];

    for (const candidate of candidates) {
      const match = matchOption(candidate, options);
      if (match) return match;
    }

    return null;
  }

  return matchOption(extractOptionValue(value), options);
};

const flattenSelectedInput = (values) => {
  if (values === undefined || values === null) {
    return [];
  }

  if (Array.isArray(values)) {
    return values;
  }

  if (typeof values === "string") {
    const trimmed = values.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return flattenSelectedInput(JSON.parse(trimmed));
      } catch (error) {
        // Fall back to comma-separated parsing.
      }
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof values === "object") {
    const entries = Object.entries(values);

    if (entries.length > 0 && entries.every(([, entryValue]) => typeof entryValue === "boolean")) {
      return entries.filter(([, selected]) => selected).map(([key]) => key);
    }

    if (Object.values(values).some(Array.isArray)) {
      return Object.values(values).flatMap((item) => (Array.isArray(item) ? item : [item]));
    }

    return [values];
  }

  return [values];
};

const normalizeSelectedOptions = (values, options) => {
  const inputValues = flattenSelectedInput(values);

  return [
    ...new Set(
      inputValues.map((value) => normalizeOption(value, options)).filter(Boolean)
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

const isEmptySelectedValue = (value) => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const getSelectedValue = (body, keys) => {
  let emptyValue;

  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) {
      if (!isEmptySelectedValue(body[key])) {
        return body[key];
      }

      if (emptyValue === undefined) {
        emptyValue = body[key];
      }
    }
  }

  return emptyValue;
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
  getOrCreateRoleProfile,
  getProfileQuery,
  getSelectedValue,
  isValidUrl,
  mergeNestedProfileBody,
  normalizeOption,
  normalizeSelectedOptions,
  normalizeText,
  normalizeWebsite,
};
