# Viral Flight Backend APIs

Base URL:

```txt
Local: http://localhost:5000
Production: https://viralflight-new-backend.onrender.com
```

Protected influencer APIs need this header:

```txt
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

## MongoDB Storage

Auth user data is saved in:

```txt
Collection: users
```

Main fields:

```txt
mobile, role, isMobileVerified, lastOtpRequestedAt, lastLoginAt
```

Influencer onboarding data is saved in:

```txt
Collection: influencer_profiles
```

Main fields:

```txt
userId, mobile, name, city, platforms, contentCategories, contentLanguages,
bio, collaborationPreferences, rateRange, pastCollaborations, portfolioLinks,
isProfileComplete, completedAt
```

Influencer onboarding settings are read from:

```txt
Collection: cms_settings
Key: influencer_onboarding
```

Admin editing is handled by Payload CMS, not by custom backend admin APIs.

```txt
Payload Admin: /admin
Payload CMS: https://payloadcms.com/
```

The influencer app reads CMS values from:

```txt
GET /api/influencer/onboarding-options
```

## Auth

### Send OTP

```txt
POST /api/auth/send-otp
```

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

This saves/updates the user in MongoDB with selected role and OTP request time.

### Verify OTP

```txt
POST /api/auth/verify-otp
```

```json
{
  "mobile": "+917018319344",
  "otp": "123456"
}
```

Success response:

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "selectedRole": "influencer",
  "dashboard": "influencer",
  "redirectTo": "/dashboard/influencer",
  "accessToken": "...",
  "refreshToken": "..."
}
```

`accessToken` is used for API calls. `refreshToken` is used to get a new access token.

### Refresh Token

```txt
POST /api/auth/refresh-token
```

```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

## Influencer Onboarding

### Get Onboarding Options

```txt
GET /api/influencer/onboarding-options
```

Returns cities, platforms, primary platforms, content categories, content languages, and collaboration preferences for frontend screens.

### Save Basic Info

```txt
POST /api/influencer/basic-info
```

```json
{
  "name": "Garry",
  "city": "Mumbai"
}
```

Allowed cities:

```txt
Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Kolkata
```

### Get Platform Options

```txt
GET /api/influencer/platform-options
```

Returns all platform options and required fields for frontend forms.

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

TikTok, Twitter, Facebook, LinkedIn, Snapchat:

```json
{
  "platform": "twitter",
  "username": "garry_twitter",
  "followers": 25000,
  "engagement": 3.8
}
```

Allowed platforms:

```txt
instagram, youtube, tiktok, twitter, facebook, linkedin, snapchat
```

At least one primary platform is required before the user can continue:

```txt
instagram, youtube, tiktok
```

Twitter, Facebook, LinkedIn, and Snapchat are optional add-more platforms.

### Save Content Preferences

```txt
POST /api/influencer/content-preferences
```

The user must select at least 5 content categories and at least 1 language.

```json
{
  "contentCategories": [
    "Fashion",
    "Beauty",
    "Travel",
    "Lifestyle",
    "Technology"
  ],
  "contentLanguages": ["Hindi", "English"]
}
```

### Finish Profile

```txt
POST /api/influencer/finish-profile
POST /api/influencer/complete-profile
```

Bio must be at least 30 characters. Collaboration preferences must have 1 or 2 selected values.

```json
{
  "bio": "I create lifestyle and fashion content for young urban audiences.",
  "collaborationPreferences": ["paid_only", "paid_and_barter"],
  "rateRange": {
    "min": 5000,
    "max": 25000,
    "currency": "INR"
  },
  "pastCollaborations": ["Nike", "Boat", "Nykaa"],
  "portfolioLinks": [
    "https://instagram.com/garry_insta",
    "https://youtube.com/@garryvlogs"
  ]
}
```

Allowed collaboration preferences:

```txt
paid_only, barter_product, paid_and_barter
```

Success response includes:

```json
{
  "success": true,
  "message": "Influencer profile completed successfully",
  "onboardingStep": "completed",
  "redirectTo": "/dashboard/influencer"
}
```

### Get My Profile

```txt
GET /api/influencer/me
```

Returns saved influencer profile, onboarding step, and connected platforms.
