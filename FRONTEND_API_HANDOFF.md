# Viral Flight Backend API Handoff

Base URLs:

```txt
Local: http://localhost:5000
Production: https://viralflight-new-backend.onrender.com
```

## Common Headers

Public APIs:

```txt
Content-Type: application/json
```

Influencer protected APIs:

```txt
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

## Admin CMS

Use Payload CMS for admin login and content editing. This backend no longer ships a custom admin login page or `/api/admin/*` endpoints.

```txt
Payload Admin: /admin
Payload CMS: https://payloadcms.com/
```

## Auth Flow

### 1. Send OTP

```txt
POST /api/auth/send-otp
```

Use when user selects role and enters mobile number.

Request:

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

Success response:

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "selectedRole": "influencer"
}
```

Possible error:

```json
{
  "success": false,
  "message": "Valid role is required: agency, influencer, or brand"
}
```

### 2. Verify OTP

```txt
POST /api/auth/verify-otp
```

Use after user enters OTP.

Request:

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
  "accessToken": "ACCESS_TOKEN",
  "refreshToken": "REFRESH_TOKEN"
}
```

Frontend should save `accessToken` for protected APIs and `refreshToken` for token refresh.

### 3. Refresh Access Token

```txt
POST /api/auth/refresh-token
```

Request:

```json
{
  "refreshToken": "REFRESH_TOKEN"
}
```

Success response:

```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "accessToken": "NEW_ACCESS_TOKEN"
}
```

## Influencer Onboarding

All APIs below need:

```txt
Authorization: Bearer ACCESS_TOKEN
```

### 1. Get Onboarding Options

```txt
GET /api/influencer/onboarding-options
```

Use before rendering onboarding screens. This data comes from CMS settings.

Success response:

```json
{
  "success": true,
  "cities": ["Mumbai", "Delhi", "Bengaluru"],
  "platforms": [
    {
      "platform": "instagram",
      "label": "Instagram",
      "fields": ["username", "followers", "engagement"]
    }
  ],
  "primaryPlatforms": ["instagram", "youtube", "tiktok"],
  "contentCategories": ["Fashion", "Beauty", "Travel", "Food", "Fitness"],
  "contentLanguages": ["English", "Hindi"],
  "collaborationPreferences": ["paid_only", "barter_product", "paid_and_barter"]
}
```

### 2. Get My Profile

```txt
GET /api/influencer/me
```

Use to resume onboarding from the correct step.

Success response:

```json
{
  "success": true,
  "onboardingStep": "basic-info",
  "profile": {
    "_id": "PROFILE_ID",
    "mobile": "+917018319344",
    "platforms": [],
    "isProfileComplete": false
  }
}
```

Possible `onboardingStep` values:

```txt
basic-info
connect-platform
content-preferences
finish-profile
completed
```

### 3. Save Basic Info

```txt
POST /api/influencer/basic-info
```

Use on first onboarding screen.

Request:

```json
{
  "name": "Garry",
  "city": "Mumbai"
}
```

Success response:

```json
{
  "success": true,
  "message": "Basic info saved successfully",
  "onboardingStep": "connect-platform",
  "nextStep": "connect-platform",
  "profile": {}
}
```

Validation:

```txt
name: required, minimum 2 characters
city: must be one of CMS cities
```

### 4. Get Platform Options

```txt
GET /api/influencer/platform-options
```

Use to render dynamic platform fields.

Success response:

```json
{
  "success": true,
  "platforms": [
    {
      "platform": "instagram",
      "label": "Instagram",
      "fields": ["username", "followers", "engagement"]
    },
    {
      "platform": "youtube",
      "label": "YouTube",
      "fields": ["channelName", "subscribers", "engagement"]
    }
  ]
}
```

### 5. Connect Platform

```txt
POST /api/influencer/connect-platform
```

Use when user connects Instagram, YouTube, TikTok, etc.

Instagram request:

```json
{
  "platform": "instagram",
  "username": "garry_insta",
  "followers": 50000,
  "engagement": 4.5
}
```

YouTube request:

```json
{
  "platform": "youtube",
  "channelName": "Garry Vlogs",
  "subscribers": 120000,
  "engagement": 6.2
}
```

Other platform request:

```json
{
  "platform": "twitter",
  "username": "garry_twitter",
  "followers": 25000,
  "engagement": 3.8
}
```

Success response:

```json
{
  "success": true,
  "message": "instagram connected successfully",
  "onboardingStep": "content-preferences",
  "nextStep": "content-preferences",
  "profile": {}
}
```

Validation:

```txt
Basic info must be completed first.
First connected platform must be one of primaryPlatforms.
engagement must be 0 to 100.
followers/subscribers must be valid positive numbers.
```

### 6. Save Content Preferences

```txt
POST /api/influencer/content-preferences
```

Use after at least one primary platform is connected.

Request:

```json
{
  "contentCategories": ["Fashion", "Beauty", "Travel", "Lifestyle", "Technology"],
  "contentLanguages": ["Hindi", "English"]
}
```

Success response:

```json
{
  "success": true,
  "message": "Content preferences saved successfully",
  "onboardingStep": "finish-profile",
  "nextStep": "finish-profile",
  "profile": {}
}
```

Validation:

```txt
contentCategories: minimum 5
contentLanguages: minimum 1
values must exist in CMS settings
```

### 7. Finish Profile

```txt
POST /api/influencer/finish-profile
```

Alternative endpoint:

```txt
POST /api/influencer/complete-profile
```

Request:

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

Success response:

```json
{
  "success": true,
  "message": "Influencer profile completed successfully",
  "onboardingStep": "completed",
  "redirectTo": "/dashboard/influencer",
  "profile": {}
}
```

Validation:

```txt
bio: minimum 30 characters
collaborationPreferences: select 1 or 2
rateRange.min and rateRange.max: valid numbers, max must be greater than or equal to min
portfolioLinks: valid http/https URLs
```

## Frontend Flow Summary

1. Role select screen: call `POST /api/auth/send-otp`.
2. OTP screen: call `POST /api/auth/verify-otp`.
3. Save `accessToken` and `refreshToken`.
4. If role is `influencer`, call `GET /api/influencer/me`.
5. Route user based on `onboardingStep`.
6. Before rendering form dropdowns, call `GET /api/influencer/onboarding-options`.
7. Submit each onboarding step to its matching API.
8. When `onboardingStep` is `completed`, redirect to `/dashboard/influencer`.

Brand and campaign route files exist in the repo but are currently empty and not mounted in `src/app.js`, so there are no active brand/campaign APIs yet.
