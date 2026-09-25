export const buildBioInput = (body = {}, profile = {}) => ({
  name: body.name || profile.name,
  location: body.location || body.city || profile.city,
  profileType: body.profileType || profile.profileType,
  categories: body.contentCategories?.length ? body.contentCategories
    : body.categories?.length ? body.categories : profile.contentCategories,
  profession: body.profession || profile.profession,
  languages: body.languages?.length ? body.languages : profile.contentLanguages,
});
