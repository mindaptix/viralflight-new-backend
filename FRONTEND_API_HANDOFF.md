# Viral Flight API - New User Single Form Flow

Base URL:

```txt
https://viralflight-new-backend.onrender.com
```

## Rule

```txt
GET API me body nahi bhejni.
POST API me body bhejni.
Login/Verify OTP ke baad accessToken milega.
Single onboarding submit API me accessToken bhejna zaroori hai.
```

Token header:

```txt
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
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

Frontend ko `accessToken` save karna hai.

## 3. Form Options Load - Token chahiye

Is API se frontend ko dropdown options milenge:

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

Response example:

```json
{
  "success": true,
  "cities": ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata"],
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
  ],
  "contentCategories": ["Fashion", "Lifestyle", "Beauty", "Fitness", "Travel"],
  "contentLanguages": ["Hindi", "English"],
  "collaborationPreferences": [
    { "value": "paid_only", "label": "Paid only" },
    { "value": "barter_product", "label": "Barter / product" },
    { "value": "paid_and_barter", "label": "Paid & barter" }
  ]
}
```

Frontend screen me ye fields dikhao:

```txt
Name input
Location dropdown
Platform dropdown
Username / Channel Name
Followers / Subscribers
Engagement
Content Categories
Content Languages
Bio
Collaboration Preference
Rate Min
Rate Max
Currency
Past Collaborations
Portfolio Link
```

## 4. Submit Full Onboarding Form - Token chahiye

Yahi main API hai. User saari details fill kare, phir submit/continue par ye call karo.

```txt
POST https://viralflight-new-backend.onrender.com/api/influencer/full-onboarding
```

Headers:

```txt
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

Instagram body:

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

YouTube body:

```json
{
  "name": "Garry",
  "city": "Mumbai",
  "platform": {
    "platform": "youtube",
    "channelName": "Garry Vlogs",
    "subscribers": 120000,
    "engagement": 6.2
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
  "portfolioLink": "https://youtube.com/@garryvlogs"
}
```

Success response:

```json
{
  "success": true,
  "message": "Influencer onboarding completed successfully",
  "onboardingStep": "completed",
  "redirectTo": "/dashboard/influencer",
  "profile": {}
}
```

## 5. Profile Check - Token chahiye

Submit ke baad profile check karna ho to:

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
  "onboardingStep": "completed",
  "profile": {
    "name": "Garry",
    "city": "Mumbai",
    "isProfileComplete": true
  }
}
```

## 6. Refresh Token - Token nahi chahiye

Access token expire ho jaye to:

```txt
POST https://viralflight-new-backend.onrender.com/api/auth/refresh-token
```

Body:

```json
{
  "refreshToken": "REFRESH_TOKEN"
}
```

## Simple Frontend Flow

```txt
Send OTP
Verify OTP
Save accessToken
GET onboarding-options
Show one full form
POST full-onboarding with accessToken
Redirect dashboard
```

Step-wise old APIs abhi bhi available hain, but new frontend ke liye `POST /api/influencer/full-onboarding` use karo.
