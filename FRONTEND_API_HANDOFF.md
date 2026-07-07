# Viral Flight API - Simple Frontend Note

Base URL:

```txt
https://viralflight-new-backend.onrender.com
```

## Main Rules

```txt
GET API me body nahi bhejni.
POST API me body bhejni.
accessToken verify OTP ke response se milega.
Jahan token chahiye, header me Authorization bhejna.
```

Token header:

```txt
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

## 0. Health Check - Token nahi chahiye

```txt
GET https://viralflight-new-backend.onrender.com/api/health
```

Body:

```txt
No body
```

Response:

```json
{
  "success": true,
  "message": "Viral Flight API is running",
  "env": "production"
}
```

## 1. Send OTP - Token nahi chahiye

```txt
POST https://viralflight-new-backend.onrender.com/api/auth/send-otp
```

Body:

```json
{
  "mobile": "+917018319344",
  "role": "influencer"
}
```

Response:

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "selectedRole": "influencer"
}
```

## 2. Verify OTP - Token nahi chahiye

```txt
POST https://viralflight-new-backend.onrender.com/api/auth/verify-otp
```

Body:

```json
{
  "mobile": "+917018319344",
  "otp": "123456"
}
```

Response:

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

Save `accessToken` and `refreshToken`.

## 3. Get Influencer Profile - Token chahiye

```txt
GET https://viralflight-new-backend.onrender.com/api/influencer/me
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

Response:

```json
{
  "success": true,
  "onboardingStep": "basic-info",
  "profile": {
    "_id": "PROFILE_ID",
    "mobile": "+917018319344",
    "platforms": [],
    "contentCategories": [],
    "contentLanguages": [],
    "isProfileComplete": false
  }
}
```

## 4. Get Onboarding Options - Token chahiye

```txt
GET https://viralflight-new-backend.onrender.com/api/influencer/onboarding-options
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

Response:

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
  "contentCategories": ["Fashion", "Lifestyle", "Beauty"],
  "contentLanguages": ["Hindi", "English"],
  "collaborationPreferences": [
    { "value": "paid_only", "label": "Paid only" }
  ]
}
```

## 5. Save Basic Info - Token chahiye

```txt
POST https://viralflight-new-backend.onrender.com/api/influencer/basic-info
```

Headers:

```txt
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "name": "Garry",
  "city": "Mumbai"
}
```

Response:

```json
{
  "success": true,
  "message": "Basic info saved successfully",
  "onboardingStep": "connect-platform",
  "nextStep": "connect-platform",
  "profile": {}
}
```

## 6. Get Platform Options - Token chahiye

```txt
GET https://viralflight-new-backend.onrender.com/api/influencer/platform-options
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

Response:

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

## 7. Connect Platform - Token chahiye

```txt
POST https://viralflight-new-backend.onrender.com/api/influencer/connect-platform
```

Headers:

```txt
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

Instagram body:

```json
{
  "platform": "instagram",
  "username": "garry_insta",
  "followers": 50000,
  "engagement": 4.5
}
```

YouTube body:

```json
{
  "platform": "youtube",
  "channelName": "Garry Vlogs",
  "subscribers": 120000,
  "engagement": 6.2
}
```

Response:

```json
{
  "success": true,
  "message": "instagram connected successfully",
  "onboardingStep": "content-preferences",
  "nextStep": "content-preferences",
  "profile": {}
}
```

## 8. Save Content Preferences - Token chahiye

```txt
POST https://viralflight-new-backend.onrender.com/api/influencer/content-preferences
```

Headers:

```txt
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "contentCategories": ["Fashion", "Lifestyle", "Beauty", "Fitness", "Travel"],
  "contentLanguages": ["Hindi", "English"]
}
```

Response:

```json
{
  "success": true,
  "message": "Content preferences saved successfully",
  "onboardingStep": "finish-profile",
  "nextStep": "finish-profile",
  "profile": {}
}
```

## 9. Finish Profile - Token chahiye

```txt
POST https://viralflight-new-backend.onrender.com/api/influencer/finish-profile
```

Headers:

```txt
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
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

Response:

```json
{
  "success": true,
  "message": "Influencer profile completed successfully",
  "onboardingStep": "completed",
  "redirectTo": "/dashboard/influencer",
  "profile": {}
}
```

## 10. Refresh Token - Token nahi chahiye

```txt
POST https://viralflight-new-backend.onrender.com/api/auth/refresh-token
```

Body:

```json
{
  "refreshToken": "REFRESH_TOKEN"
}
```

Response:

```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "accessToken": "NEW_ACCESS_TOKEN"
}
```

## Token Summary

Token nahi chahiye:

```txt
0. Health Check
1. Send OTP
2. Verify OTP
10. Refresh Token
```

Token chahiye:

```txt
3. Get Influencer Profile
4. Get Onboarding Options
5. Save Basic Info
6. Get Platform Options
7. Connect Platform
8. Save Content Preferences
9. Finish Profile
```

## Flow

```txt
Send OTP
Verify OTP
Save accessToken
Get Profile
Get Options
Save Basic Info
Connect Platform
Save Content Preferences
Finish Profile
```

Brand/campaign APIs abhi ready nahi hain. Abhi sirf influencer onboarding APIs use karni hain.
