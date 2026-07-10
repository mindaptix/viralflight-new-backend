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

Same mobile number can register once as `brand`, once as `agency`, and once as `influencer`. Do not create a second account for the same mobile and same role; login to that existing role instead.

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
  "role": "influencer",
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

## 5. Full Profile Detail - Token chahiye

Submit ke baad complete profile detail leni ho to:

```txt
GET https://viralflight-new-backend.onrender.com/api/influencer/profile
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
  "message": "Influencer profile fetched successfully",
  "onboardingStep": "completed",
  "user": {
    "userId": "USER_ID",
    "mobile": "+917018319344",
    "role": "influencer"
  },
  "profile": {
    "_id": "PROFILE_ID",
    "name": "Garry",
    "city": "Mumbai",
    "platforms": [
      {
        "platform": "instagram",
        "username": "garry_insta",
        "followers": 50000,
        "engagement": 4.5
      }
    ],
    "contentCategories": ["Fashion", "Lifestyle", "Beauty", "Fitness", "Travel"],
    "contentLanguages": ["Hindi", "English"],
    "bio": "I create lifestyle and fashion content for young urban audiences.",
    "collaborationPreference": "paid_only",
    "rateRange": {
      "min": 5000,
      "max": 25000,
      "currency": "INR"
    },
    "pastCollaborations": ["Nike", "Boat", "Nykaa"],
    "portfolioLink": "https://instagram.com/garry_insta",
    "isProfileComplete": true
  },
  "profileFields": [
    {
      "key": "name",
      "label": "Name",
      "value": "Garry"
    }
  ]
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

## 7. Logout - Token chahiye

Logged-in user ko logout karne ke liye role-wise API call kar sakte ho:

```txt
Brand:
POST https://viralflight-new-backend.onrender.com/api/brand/logout

Agency:
POST https://viralflight-new-backend.onrender.com/api/agency/logout

Influencer:
POST https://viralflight-new-backend.onrender.com/api/influencer/logout
```

Generic API bhi available hai:

```txt
POST https://viralflight-new-backend.onrender.com/api/auth/logout
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

Success response:

```json
{
  "success": true,
  "message": "Logged out successfully",
  "loggedOutRole": "brand",
  "redirectTo": "/login"
}
```

Frontend logout logic:

```txt
1. Role ke hisaab se logout API call karo.
2. Success aane ke baad local storage/secure storage se accessToken delete karo.
3. refreshToken bhi delete karo.
4. User/session data clear karo.
5. Login screen par navigate karo.
```

## Simple Frontend Flow

```txt
Send OTP
Verify OTP
Save accessToken
GET onboarding-options
Show one full form
POST full-onboarding with accessToken
GET profile with accessToken
Redirect dashboard
```

Step-wise old APIs abhi bhi available hain, but new frontend ke liye `POST /api/influencer/full-onboarding` use karo.

Influencer Profile tab ke liye `GET /api/influencer/profile` call karo aur `response.profileFields` ko render karo. Isme wahi saved data aayega jo influencer ne onboarding me fill kiya hai.

## Influencer Dashboard Stats - Token chahiye

Influencer home/dashboard cards ke liye ye API call karo:

```txt
GET https://viralflight-new-backend.onrender.com/api/influencer/dashboard-stats
```

Headers:

```txt
Authorization: Bearer INFLUENCER_ACCESS_TOKEN
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
  "message": "Influencer dashboard stats fetched successfully",
  "profileId": "INFLUENCER_PROFILE_ID",
  "stats": {
    "profileViews": 0,
    "brandInvites": 0,
    "activeCollabs": 0
  },
  "statCards": [
    {
      "key": "profileViews",
      "label": "Profile views",
      "value": 0,
      "displayValue": "0"
    },
    {
      "key": "brandInvites",
      "label": "Brand invites",
      "value": 0,
      "displayValue": "0"
    },
    {
      "key": "activeCollabs",
      "label": "Active collabs",
      "value": 0,
      "displayValue": "0"
    }
  ]
}
```

Frontend mapping:

```txt
Profile Views card: stats.profileViews ya statCards key profileViews
Brand Invites card: stats.brandInvites ya statCards key brandInvites
Active Collabs card: stats.activeCollabs ya statCards key activeCollabs
No data ho to API 0 return karegi.
```

Brand/agency jab influencer profile open kare, tab view count ke liye ye API call karo:

```txt
POST https://viralflight-new-backend.onrender.com/api/influencer/profile-views
```

Headers:

```txt
Authorization: Bearer BRAND_OR_AGENCY_ACCESS_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "influencerProfileId": "INFLUENCER_PROFILE_ID"
}
```

Success:

```json
{
  "success": true,
  "message": "Influencer profile view recorded successfully"
}
```

## Influencer Campaigns For You - Token chahiye

Influencer home/dashboard me `Campaigns for you` section ke liye ye API call karo:

```txt
GET https://viralflight-new-backend.onrender.com/api/influencer/campaigns-for-you
```

Optional limit:

```txt
GET https://viralflight-new-backend.onrender.com/api/influencer/campaigns-for-you?limit=10
```

Headers:

```txt
Authorization: Bearer INFLUENCER_ACCESS_TOKEN
Content-Type: application/json
```

Body:

```txt
No body
```

Success response:

```json
{
  "success": true,
  "message": "Campaigns for influencer fetched successfully",
  "count": 1,
  "campaigns": [
    {
      "id": "CAMPAIGN_ID",
      "brandName": "Glow Co.",
      "title": "Summer Skincare Reel",
      "description": "Create one Instagram reel for our skincare launch.",
      "category": "Beauty",
      "platforms": ["instagram"],
      "deliverables": ["1 Reel"],
      "budgetAmount": 25000,
      "budgetCurrency": "INR",
      "budgetDisplay": "₹25,000",
      "coverImageUrl": "https://example.com/campaign.jpg",
      "location": "Delhi",
      "applicationDeadline": "2026-07-15T00:00:00.000Z",
      "daysLeft": 3,
      "daysLeftText": "3 days left",
      "matchPercent": 94,
      "status": "active"
    }
  ]
}
```

Frontend mapping:

```txt
Brand text: campaign.brandName
Title: campaign.title
Category chip: campaign.category
Budget: campaign.budgetDisplay
Image: campaign.coverImageUrl
Match badge: campaign.matchPercent + "% match"
Deadline text: campaign.daysLeftText
Apply button: campaign.id pass karke next apply flow me use karo
No campaigns ho to empty state dikhana, API count 0 and campaigns [] bhejegi.
```

Brand side campaign create karne ke liye:

```txt
POST https://viralflight-new-backend.onrender.com/api/brand/campaigns
```

Headers:

```txt
Authorization: Bearer BRAND_ACCESS_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "title": "Summer Skincare Reel",
  "description": "Create one Instagram reel for our skincare launch.",
  "category": "Beauty",
  "platforms": ["instagram"],
  "deliverables": ["1 Reel"],
  "budgetAmount": 25000,
  "budgetCurrency": "INR",
  "coverImageUrl": "https://example.com/campaign.jpg",
  "location": "Delhi",
  "applicationDeadline": "2026-07-15",
  "status": "active"
}
```

Brand ke campaigns list:

```txt
GET https://viralflight-new-backend.onrender.com/api/brand/campaigns
```

Agency side campaign create karne ke liye:

```txt
POST https://viralflight-new-backend.onrender.com/api/agency/campaigns
```

Headers:

```txt
Authorization: Bearer AGENCY_ACCESS_TOKEN
Content-Type: application/json
```

Body brand campaign jaisa hi hai:

```json
{
  "title": "Creator Launch Campaign",
  "description": "Create one Instagram reel for a managed client launch.",
  "category": "Lifestyle",
  "platforms": ["instagram"],
  "deliverables": ["1 Reel"],
  "budgetAmount": 25000,
  "budgetCurrency": "INR",
  "coverImageUrl": "https://example.com/campaign.jpg",
  "location": "Delhi",
  "applicationDeadline": "2026-07-15",
  "status": "active"
}
```

Agency ke campaigns list:

```txt
GET https://viralflight-new-backend.onrender.com/api/agency/campaigns
```

## Agency Profile Tab - Token chahiye

Agency onboarding complete hone ke baad Profile tab me ye API call karo:

```txt
GET https://viralflight-new-backend.onrender.com/api/agency/profile
```

Headers:

```txt
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
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

Profile screen ke liye recommended:

```txt
Agency name header: profile.agencyName
Sub text: Signed in as profile.agencyName
Details list: response.profileFields
Array value jaise focusAreas ko comma se join karke dikhao.
```

## Brand Profile Tab - Token chahiye

Brand onboarding complete hone ke baad Profile tab me placeholder/Coming soon mat dikhao. Ye API call karo:

```txt
GET https://viralflight-new-backend.onrender.com/api/brand/profile
```

Headers:

```txt
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
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

Profile screen ke liye recommended:

```txt
Brand name header: profile.brandName
Sub text: Signed in as profile.brandName
Details list: response.profileFields
Array value jaise campaignInterests ko comma se join karke dikhao.
```
