import { searchInfluencers } from "../services/discoveryService.js";

export const listAgencyInfluencers = async (req, res) => {
  try {
    const influencers = await searchInfluencers({
      search: req.query.search || req.query.q || "",
      niche: req.query.niche || req.query.category || "",
      city: req.query.city || "",
      limit: req.query.limit,
    });

    res.json({
      success: true,
      count: influencers.length,
      influencers,
      creators: influencers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listBrandCreators = async (req, res) => {
  try {
    const creators = await searchInfluencers({
      search: req.query.search || req.query.q || "",
      niche: req.query.niche || req.query.category || "",
      city: req.query.city || "",
      limit: req.query.limit,
    });

    res.json({
      success: true,
      count: creators.length,
      creators,
      influencers: creators,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
