const topicGroups = [
  ['motherhood', 'parenting', 'mothers', 'mother', 'mom', 'family'],
  ['doctor', 'healthcare', 'medical', 'medicine', 'health'],
  ['fitness', 'workout', 'training', 'wellness'],
  ['meme', 'memes', 'comedy', 'humor', 'humour'],
];

const topics = (values) => {
  const result = new Set();
  for (const value of values) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) continue;
    result.add(normalized);
    normalized.split(/[^\p{L}\p{N}]+/u).filter(Boolean).forEach((word) => result.add(word));
  }
  for (const group of topicGroups) {
    if (group.some((word) => result.has(word))) group.forEach((word) => result.add(word));
  }
  return result;
};

export const communityRecommendationScore = (community, profile) => {
  if (!profile) return 0;
  const interests = topics(profile.contentCategories || []);
  const communityTopics = topics([community.category, ...(community.tags || [])]);
  const matches = [...interests].filter((topic) => communityTopics.has(topic));
  let score = Math.min(matches.length, 4) * 20;
  const scannedAt = profile.communityRecommendations?.scannedAt;
  if (scannedAt && Date.now() - new Date(scannedAt).getTime() < 30 * 86400000) {
    const inferred = topics(profile.communityRecommendations.topics || []);
    score += Math.min([...inferred].filter((topic) => communityTopics.has(topic)).length, 3) * 10;
  }
  if (profile.profileType === 'regional' && profile.city &&
      String(community.city || '').toLowerCase() === profile.city.toLowerCase()) score += 35;
  if (profile.profileType === 'community' && ['community', 'meme', 'niche', 'page'].some((topic) => communityTopics.has(topic))) score += 25;
  return score;
};
