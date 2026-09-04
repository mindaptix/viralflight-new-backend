import fs from "fs/promises";
import path from "path";

const CATEGORIES = [
  "Fashion",
  "Lifestyle",
  "Beauty",
  "Fitness",
  "Food",
  "Travel",
  "Tech",
  "Finance",
  "Gaming",
  "Parenting",
  "Education",
  "Comedy",
  "Music",
  "Dance",
  "Photography",
  "Art & Design",
  "Health & Wellness",
  "Automobile",
  "Real Estate",
  "Sports",
  "Pets",
  "Spirituality",
  "News & Commentary",
  "DIY & Crafts",
];

const PLATFORMS = ["instagram", "youtube", "tiktok", "twitter"];
const DELIVERABLES = ["1 Reel", "1 Post", "1 Story", "1 Video", "1 Short"];

const SYSTEM = `You are Viral Flight's campaign producer for Indian influencer marketing.
Look at the campaign/product/brand image and draft a ready-to-post campaign brief.
Return ONLY valid JSON with keys:
{
  "title": string (max 80 chars, catchy campaign title),
  "description": string (120-280 chars, clear creator brief),
  "category": string (MUST be one of: ${CATEGORIES.join(", ")}),
  "platforms": string[] (subset of: ${PLATFORMS.join(", ")}),
  "deliverables": string[] (subset of: ${DELIVERABLES.join(", ")}),
  "budgetAmount": number (INR integer between 5000 and 500000, realistic for India),
  "location": string (city or "Pan India"),
  "applicationDeadlineDays": number (integer 7-45)
}
Rules:
- Infer product niche, vibe, audience from the image.
- Prefer Instagram + 1 Reel for lifestyle/beauty/fashion unless image clearly suggests YouTube/TikTok.
- Keep copy practical, brand-safe, no hashtags spam.
- If image is unclear, still produce a sensible D2C-style India campaign draft.`;

const mimeFromExt = (filePath = "") => {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".heic": "image/heic",
    }[ext] || "image/jpeg"
  );
};

const extractJson = (text = "") => {
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("AI did not return JSON");
  }
  return JSON.parse(match[0]);
};

const normalizeCategory = (value) => {
  const raw = String(value || "").trim();
  const exact = CATEGORIES.find((item) => item.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const partial = CATEGORIES.find(
    (item) =>
      item.toLowerCase().includes(raw.toLowerCase()) ||
      raw.toLowerCase().includes(item.toLowerCase())
  );
  return partial || "Lifestyle";
};

const normalizeList = (value, allowed, fallback) => {
  const list = Array.isArray(value) ? value : [];
  const cleaned = list
    .map((item) => String(item || "").trim().toLowerCase())
    .map((item) => allowed.find((option) => option.toLowerCase() === item))
    .filter(Boolean);
  const unique = [...new Set(cleaned)];
  return unique.length > 0 ? unique : fallback;
};

const normalizeDraft = (raw = {}) => {
  const days = Number(raw.applicationDeadlineDays);
  const budget = Number(raw.budgetAmount);
  return {
    title: String(raw.title || "Untitled campaign").trim().slice(0, 120),
    description: String(raw.description || "").trim().slice(0, 2000),
    category: normalizeCategory(raw.category),
    platforms: normalizeList(raw.platforms, PLATFORMS, ["instagram"]),
    deliverables: normalizeList(raw.deliverables, DELIVERABLES, ["1 Reel"]),
    budgetAmount:
      Number.isFinite(budget) && budget > 0
        ? Math.min(500000, Math.max(5000, Math.round(budget)))
        : 25000,
    location: String(raw.location || "Pan India").trim().slice(0, 80) || "Pan India",
    applicationDeadlineDays:
      Number.isFinite(days) && days > 0
        ? Math.min(45, Math.max(7, Math.round(days)))
        : 14,
  };
};

const buildImageContent = async ({ imageUrl, filePath, mimeType }) => {
  if (filePath) {
    const bytes = await fs.readFile(filePath);
    const base64 = bytes.toString("base64");
    const mime = mimeType || mimeFromExt(filePath);
    return {
      type: "image_url",
      image_url: {
        url: `data:${mime};base64,${base64}`,
      },
    };
  }

  if (imageUrl) {
    return {
      type: "image_url",
      image_url: { url: imageUrl },
    };
  }

  throw new Error("imageUrl or file is required");
};

export async function generateCampaignDraftFromImage(input) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error(
      "AI is not configured. Set OPENAI_API_KEY on the server to enable image autofill."
    );
  }

  const model = String(process.env.OPENAI_MODEL || "gpt-4o").trim() || "gpt-4o";
  const imagePart = await buildImageContent(input);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Generate a complete Viral Flight campaign draft from this image.",
            },
            imagePart,
          ],
        },
      ],
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || "AI request failed");
  }

  const text = json?.choices?.[0]?.message?.content || "";
  const parsed = extractJson(text);
  return normalizeDraft(parsed);
}

export { CATEGORIES, PLATFORMS, DELIVERABLES };
