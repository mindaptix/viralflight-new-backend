export const getGroqApiKey = () =>
  process.env.GROQ_API_KEY?.trim() || process.env.COMMUNITY_AI_API_KEY?.trim() || '';

// COMMUNITY_AI_MODEL previously configured a different provider. Groq uses its
// own model identifier, so the old value (for example "gemini") is ignored.
export const getGroqModel = () => process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-20b';
