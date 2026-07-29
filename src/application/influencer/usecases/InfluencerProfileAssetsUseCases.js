import BrandInvite from "../../../models/BrandInvite.js";
import BrandProfile from "../../../models/BrandProfile.js";
import InfluencerProfile from "../../../models/InfluencerProfile.js";
import { toDiscoveryBrandDto } from "../../discovery/mappers/brandDiscoveryMapper.js";
import { ValidationError } from "../../../shared/errors/AppError.js";
import { UseCase } from "../../../shared/usecase/UseCase.js";

const defaultRateCard = () => ({
  currency: "INR",
  items: [],
});

const defaultMediaKit = () => ({
  about: "",
  audience: {
    ageGroups: [],
    topCities: [],
    genderSplit: { female: 50, male: 50 },
  },
  caseStudies: [],
  portfolioImages: [],
});

const findInfluencerProfile = async (user) =>
  InfluencerProfile.findOne({
    $or: [{ userId: user.userId }, { mobile: user.mobile }],
  });

export class GetRateCardUseCase extends UseCase {
  async execute({ user }) {
    const profile = await findInfluencerProfile(user);
    if (!profile) {
      return { rateCard: defaultRateCard() };
    }

    const rateCard = profile.rateCard?.items?.length
      ? profile.rateCard
      : defaultRateCard();

    return { rateCard };
  }
}

export class UpdateRateCardUseCase extends UseCase {
  async execute({ user, body = {} }) {
    const profile = await findInfluencerProfile(user);
    if (!profile) {
      throw new ValidationError("Complete influencer onboarding first");
    }

    const currency =
      typeof body.currency === "string" && body.currency.trim()
        ? body.currency.trim().toUpperCase()
        : "INR";
    const items = Array.isArray(body.items)
      ? body.items
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            platform: `${item.platform || ""}`.trim().toLowerCase(),
            deliverable: `${item.deliverable || ""}`.trim().toLowerCase(),
            price: Math.max(0, Number(item.price) || 0),
          }))
          .filter((item) => item.platform && item.deliverable)
      : [];

    profile.rateCard = { currency, items };
    await profile.save();

    return { rateCard: profile.rateCard };
  }
}

export class GetMediaKitUseCase extends UseCase {
  async execute({ user }) {
    const profile = await findInfluencerProfile(user);
    if (!profile) {
      return { mediaKit: defaultMediaKit() };
    }

    const mediaKit = profile.mediaKit?.about
      ? profile.mediaKit
      : defaultMediaKit();

    return { mediaKit };
  }
}

export class UpdateMediaKitUseCase extends UseCase {
  async execute({ user, body = {} }) {
    const profile = await findInfluencerProfile(user);
    if (!profile) {
      throw new ValidationError("Complete influencer onboarding first");
    }

    const audience = body.audience && typeof body.audience === "object"
      ? body.audience
      : {};
    const genderSplit =
      audience.genderSplit && typeof audience.genderSplit === "object"
        ? audience.genderSplit
        : {};

    profile.mediaKit = {
      about: typeof body.about === "string" ? body.about.trim() : "",
      audience: {
        ageGroups: Array.isArray(audience.ageGroups)
          ? audience.ageGroups.map((item) => `${item}`.trim()).filter(Boolean)
          : [],
        topCities: Array.isArray(audience.topCities)
          ? audience.topCities.map((item) => `${item}`.trim()).filter(Boolean)
          : [],
        genderSplit: {
          female: Math.min(
            100,
            Math.max(0, Number(genderSplit.female) || 50)
          ),
          male: Math.min(100, Math.max(0, Number(genderSplit.male) || 50)),
        },
      },
      caseStudies: Array.isArray(body.caseStudies)
        ? body.caseStudies
            .filter((item) => item && typeof item === "object")
            .map((item) => ({
              brand: `${item.brand || ""}`.trim(),
              title: `${item.title || ""}`.trim(),
              result: `${item.result || ""}`.trim(),
              url: `${item.url || ""}`.trim(),
            }))
            .filter((item) => item.brand || item.title)
        : [],
      portfolioImages: Array.isArray(body.portfolioImages)
        ? body.portfolioImages
            .map((item) => `${item}`.trim())
            .filter(Boolean)
        : [],
    };

    await profile.save();

    return { mediaKit: profile.mediaKit };
  }
}

export class ListInfluencerBrandInvitesUseCase extends UseCase {
  async execute({ user, limit = 20 }) {
    const profile = await findInfluencerProfile(user);
    if (!profile) {
      return { invites: [], brands: [] };
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const invites = await BrandInvite.find({
      influencerProfileId: profile._id,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .limit(safeLimit);

    const brandUserIds = [
      ...new Set(invites.map((invite) => String(invite.brandUserId))),
    ];
    const brandProfiles = await BrandProfile.find({
      userId: { $in: brandUserIds },
      isProfileComplete: true,
    });
    const brandByUserId = new Map(
      brandProfiles.map((item) => [String(item.userId), item])
    );

    const brands = invites
      .map((invite) => {
        const brandProfile = brandByUserId.get(String(invite.brandUserId));
        if (!brandProfile) {
          return null;
        }
        return {
          ...toDiscoveryBrandDto(brandProfile),
          inviteId: invite._id,
          inviteMessage: invite.message || "",
          campaignId: invite.campaignId,
        };
      })
      .filter(Boolean);

    return { invites, brands };
  }
}
