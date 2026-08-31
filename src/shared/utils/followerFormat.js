const formatFollowersDisplay = (value) => {
  const number = Number(value || 0);

  if (number >= 1_000_000) {
    const scaled = number / 1_000_000;
    return scaled % 1 === 0 ? `${scaled}M` : `${scaled.toFixed(1)}M`;
  }

  if (number >= 1_000) {
    const scaled = number / 1_000;
    return scaled % 1 === 0 ? `${scaled}K` : `${scaled.toFixed(1)}K`;
  }

  return String(number);
};

export { formatFollowersDisplay };
