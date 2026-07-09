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
```

There are no active custom `/api/admin/*`, brand, or campaign APIs right now. Payload CMS admin is available at:

```txt
/admin
```

## Headers

Public APIs:

```txt
Content-Type: application/json
```

Protected influencer APIs:

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

Returns full saved influencer profile with logged-in user summary.

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

Onboarding settings:

```txt
Collection: cms_settings
Key: influencer_onboarding
```
