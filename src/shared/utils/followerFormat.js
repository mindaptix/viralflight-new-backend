const formatFollowersDisplay = (value) => {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) return "0";
  if (count >= 1_000_000) {
    return `${Number((count / 1_000_000).toFixed(1))}M`;
  }
  if (count >= 1_000) {
    return `${Number((count / 1_000).toFixed(1))}K`;
  }
  return String(Math.round(count));
};

export { formatFollowersDisplay };
