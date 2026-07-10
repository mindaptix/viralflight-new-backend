# Viral Flight Backend APIs

Production base URL:

```txt
https://viralflight-new-backend.onrender.com
```

Local base URL:

```txt
http://localhost:5000
```

## Active Custom APIs

```txt
GET  /
GET  /health
GET  /api/health
POST /api/auth/send-otp
POST /api/auth/verify-otp
POST /api/auth/refresh-token
POST /api/auth/logout
GET  /api/influencer/onboarding-options
GET  /api/influencer/platform-options
GET  /api/influencer/me
GET  /api/influencer/profile
POST /api/influencer/basic-info
POST /api/influencer/connect-platform
POST /api/influencer/content-preferences
POST /api/influencer/finish-profile
POST /api/influencer/complete-profile
POST /api/influencer/full-onboarding
POST /api/influencer/logout
GET  /api/agency/onboarding-options
GET  /api/agency/profile
POST /api/agency/full-onboarding
POST /api/agency/logout
GET  /api/brand/onboarding-options
GET  /api/brand/profile
POST /api/brand/full-onboarding
POST /api/brand/logout
```

There are no active custom `/api/admin/*` or campaign APIs right now. Payload CMS admin is available at:

```txt
/admin
```

## Headers

Public APIs:

```txt
Content-Type: application/json
```

Protected role APIs:

```txt
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

## Auth

### Send OTP

```txt
POST /api/auth/send-otp
```

Body:

```json
{
  "mobile": "+917018319344",
  "role": "influencer"
}
```

Allowed roles:

```txt
agency, influencer, brand
```

Same mobile number can have one account per role. For example, one brand, one agency, and one influencer account are allowed for the same mobile number, but a second account with the same mobile and same role is not created.

Success:

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "selectedRole": "influencer"
}
```

### Verify OTP

```txt
POST /api/auth/verify-otp
```

Body:

```json
{
  "mobile": "+917018319344",
  "role": "influencer",
  "otp": "123456"
}
```

Success:

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "selectedRole": "influencer",
  "dashboard": "influencer",
  "redirectTo": "/dashboard/influencer",
  "accessToken": "ACCESS_TOKEN",
  "refreshToken": "REFRESH_TOKEN"
}
```

### Refresh Token

```txt
POST /api/auth/refresh-token
```

Body:

```json
{
  "refreshToken": "REFRESH_TOKEN"
}
```

Success:

```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "accessToken": "NEW_ACCESS_TOKEN"
}
```

### Logout

Generic logout API for any logged-in `agency`, `brand`, or `influencer` account:

```txt
POST /api/auth/logout
```

Headers:

```txt
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

Body:

```txt
No body
```

Success:

```json
{
  "success": true,
  "message": "Logged out successfully",
  "loggedOutRole": "brand",
  "redirectTo": "/login"
}
```

Role-wise logout aliases are also available:

```txt
POST /api/brand/logout
POST /api/agency/logout
POST /api/influencer/logout
```

Frontend must delete saved `accessToken` and `refreshToken` after logout success. Backend clears the saved refresh token so refresh-token login cannot continue.

## Influencer Onboarding

All APIs below require `Authorization: Bearer ACCESS_TOKEN`.

### Get Onboarding Options

```txt
GET /api/influencer/onboarding-options
```

Returns cities, platform config, primary/secondary platforms, content categories, languages, collaboration preferences, validation, and steps.

### Get Platform Options

```txt
GET /api/influencer/platform-options
```

Returns platform options and required fields.

### Get My Profile

```txt
GET /api/influencer/me
```

Returns saved profile and current onboarding step.

### Get Full Profile

```txt
GET /api/influencer/profile
```

Returns full saved influencer profile with logged-in user summary and `profileFields` for the Profile tab. Frontend can render `profileFields` directly; it includes only fields that have saved values.

Possible steps:

```txt
basic-info
connect-platform
content-preferences
finish-profile
completed
```

### Save Basic Info

```txt
POST /api/influencer/basic-info
```

Body:

```json
{
  "name": "Garry",
  "city": "Mumbai"
}
```

Validation:

```txt
name: minimum 2 characters
city: must match onboarding-options cities
```

### Connect Platform

```txt
POST /api/influencer/connect-platform
```

Instagram:

```json
{
  "platform": "instagram",
  "username": "garry_insta",
  "followers": 50000,
  "engagement": 4.5
}
```

YouTube:

```json
{
  "platform": "youtube",
  "channelName": "Garry Vlogs",
  "subscribers": 120000,
  "engagement": 6.2
}
```

Other username-based platforms:

```json
{
  "platform": "twitter",
  "username": "garry_twitter",
  "followers": 25000,
  "engagement": 3.8
}
```

Rules:

```txt
Basic info must be completed first.
First platform must be instagram, youtube, or tiktok.
engagement must be 0 to 100.
followers/subscribers cannot be negative.
```

### Save Content Preferences

```txt
POST /api/influencer/content-preferences
```

Body:

```json
{
  "contentCategories": ["Fashion", "Lifestyle", "Beauty", "Fitness", "Travel"],
  "contentLanguages": ["Hindi", "English"]
}
```

Rules:

```txt
contentCategories: exactly 5
contentLanguages: minimum 1
all values must match onboarding-options
```

### Finish Profile

Preferred:

```txt
POST /api/influencer/finish-profile
```

Alternative:

```txt
POST /api/influencer/complete-profile
```

Body:

```json
{
  "bio": "I create lifestyle and fashion content for young urban audiences.",
  "collaborationPreferences": ["paid_only"],
  "rateRange": {
    "min": 5000,
    "max": 25000,
    "currency": "INR"
  },
  "pastCollaborations": ["Nike", "Boat", "Nykaa"],
  "portfolioLink": "https://instagram.com/garry_insta"
}
```

Rules:

```txt
bio: minimum 30 characters
collaborationPreferences: send one selected value in an array
rateRange: optional, max must be greater than or equal to min
portfolioLink: optional, valid http/https URL
```

Success:

```json
{
  "success": true,
  "message": "Influencer profile completed successfully",
  "onboardingStep": "completed",
  "redirectTo": "/dashboard/influencer",
  "profile": {}
}
```

### Full Onboarding

Use this when frontend has one full form after login.

```txt
POST /api/influencer/full-onboarding
```

Body:

```json
{
  "name": "Garry",
  "city": "Mumbai",
  "platform": {
    "platform": "instagram",
    "username": "garry_insta",
    "followers": 50000,
    "engagement": 4.5
  },
  "contentCategories": ["Fashion", "Lifestyle", "Beauty", "Fitness", "Travel"],
  "contentLanguages": ["Hindi", "English"],
  "bio": "I create lifestyle and fashion content for young urban audiences.",
  "collaborationPreferences": ["paid_only"],
  "rateRange": {
    "min": 5000,
    "max": 25000,
    "currency": "INR"
  },
  "pastCollaborations": ["Nike", "Boat", "Nykaa"],
  "portfolioLink": "https://instagram.com/garry_insta"
}
```

Success:

```json
{
  "success": true,
  "message": "Influencer onboarding completed successfully",
  "onboardingStep": "completed",
  "redirectTo": "/dashboard/influencer",
  "profile": {}
}
```

## Agency Onboarding

All APIs below require `Authorization: Bearer ACCESS_TOKEN` for a logged-in `agency` account.

### Get Agency Onboarding Options

```txt
GET /api/agency/onboarding-options
```

Returns agency type, team size, creators managed, focus area, and validation options.

### Save Agency Full Onboarding

```txt
POST /api/agency/full-onboarding
```

Body:

```json
{
  "agencyName": "Gaurav Agency",
  "contactPerson": "Gaurav",
  "city": "Delhi",
  "agencyType": "Influencer Marketing",
  "teamSize": "2-5",
  "creatorsManaged": "11-25",
  "focusAreas": ["Fashion", "Lifestyle"],
  "website": "https://example.com",
  "description": "We manage influencer campaigns and creator partnerships for growing brands."
}
```

### Get Agency Profile

Use this API for the agency Profile tab after dashboard login:

```txt
GET /api/agency/profile
```

Response:

```json
{
  "success": true,
  "message": "Agency profile fetched successfully",
  "onboardingStep": "completed",
  "user": {
    "userId": "USER_ID",
    "mobile": "+917018319344",
    "role": "agency"
  },
  "profile": {
    "_id": "PROFILE_ID",
    "agencyName": "Gaurav Agency",
    "contactPerson": "Gaurav",
    "city": "Delhi",
    "agencyType": "Influencer Marketing",
    "teamSize": "2-5",
    "creatorsManaged": "11-25",
    "focusAreas": ["Fashion", "Lifestyle"],
    "website": "https://example.com",
    "description": "We manage influencer campaigns and creator partnerships for growing brands.",
    "isProfileComplete": true
  },
  "profileFields": [
    {
      "key": "agencyName",
      "label": "Agency / Company Name",
      "value": "Gaurav Agency"
    }
  ]
}
```

Frontend can render `profileFields` directly in the Profile tab. It includes only fields that have saved values, so empty details are not shown.

## Brand Onboarding

All APIs below require `Authorization: Bearer ACCESS_TOKEN` for a logged-in `brand` account.

### Get Brand Onboarding Options

```txt
GET /api/brand/onboarding-options
```

Returns industry, campaign interest, monthly campaign budget, and validation options for the brand form.

### Save Brand Full Onboarding

```txt
POST /api/brand/full-onboarding
```

Body:

```json
{
  "brandName": "Gaurav-Brand",
  "contactPerson": "Gaurav",
  "city": "Delhi",
  "industry": "Fashion & Apparel",
  "website": "https://example.com",
  "instagramHandle": "gaurav_brand",
  "campaignInterests": ["Influencer posts"],
  "monthlyCampaignBudget": "Not sure yet",
  "description": "We create fashion products for young urban customers across India."
}
```

### Get Brand Profile

Use this API for the brand Profile tab after dashboard login:

```txt
GET /api/brand/profile
```

Response:

```json
{
  "success": true,
  "message": "Brand profile fetched successfully",
  "onboardingStep": "completed",
  "user": {
    "userId": "USER_ID",
    "mobile": "+917018319344",
    "role": "brand"
  },
  "profile": {
    "_id": "PROFILE_ID",
    "brandName": "Gaurav-Brand",
    "contactPerson": "Gaurav",
    "city": "Delhi",
    "industry": "Fashion & Apparel",
    "website": "https://example.com",
    "instagramHandle": "gaurav_brand",
    "campaignInterests": ["Influencer posts"],
    "monthlyCampaignBudget": "Not sure yet",
    "description": "We create fashion products for young urban customers across India.",
    "isProfileComplete": true
  },
  "profileFields": [
    {
      "key": "brandName",
      "label": "Brand / Company Name",
      "value": "Gaurav-Brand"
    }
  ]
}
```

Frontend can render `profileFields` directly in the Profile tab. It includes only fields that have saved values, so empty details are not shown.

## Database Storage

Auth users:

```txt
Collection: users
Fields: mobile, role, isMobileVerified, lastOtpRequestedAt, lastLoginAt
```

Influencer profiles:

```txt
Collection: influencer_profiles
Fields: userId, mobile, name, city, platforms, contentCategories,
contentLanguages, bio, collaborationPreference, rateRange,
pastCollaborations, portfolioLink, isProfileComplete, completedAt
```

Agency profiles:

```txt
Collection: agency_profiles
Fields: userId, mobile, agencyName, contactPerson, city, agencyType,
teamSize, creatorsManaged, focusAreas, website, description,
isProfileComplete, completedAt
```

Onboarding settings:

```txt
Collection: cms_settings
Key: influencer_onboarding
```

Brand profiles:

```txt
Collection: brand_profiles
Fields: userId, mobile, brandName, contactPerson, city, industry, website,
instagramHandle, campaignInterests, monthlyCampaignBudget, description,
isProfileComplete, completedAt
```
