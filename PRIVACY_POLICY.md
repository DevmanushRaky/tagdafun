# Privacy Policy — Tagda Fun

**Effective Date:** August 19, 2025  
**Last Updated:** October 24, 2026  
**Developer:** DevmanushRaky 
**App:** Tagda Fun  
**Platform:** Google Play Store  

---

## 1. Overview

Tagda Fun is a casual mobile gaming app featuring Coin Toss, Memory Cards, and Water Sorting with a gamification system (XP, levels, achievements, leaderboard). This policy explains what data the app stores, how it is handled, and your rights as a user.

**Short version:** Tagda Fun stores your game progress locally on your device. We do not collect personal information, run no backend server, and require no account. The app shows ads through Unity LevelPlay, which may collect certain device data (such as the advertising ID) as described in Section 5.3.

---

## 2. What Data We Store

All game data is stored **only on your device** using AsyncStorage (local storage). We do not transmit it to any server. (Ad networks, covered in Section 5.3, operate separately.)

### 2.1 Game Statistics (Stored Locally)

| Data | Purpose | Stored Where |
|------|---------|-------------|
| Coins earned per game | Track wallet balance | Device only |
| XP and level progress | Show your level in the app | Device only |
| Games played count (per game type) | Show stats on profile screen | Device only |
| Coin toss wins / flips | Profile stats | Device only |
| Memory card games played | Profile stats | Device only |
| Water Sorting games played and current level | Profile stats and level progress | Device only |
| Current streak and best streak | Achievement tracking | Device only |
| Achievement unlock status | Profile screen | Device only |
| Daily challenge progress | Home screen challenge | Device only |
| Weekly coin total | Leaderboard screen | Device only |

### 2.2 Game History Log (Stored Locally)

The app saves a log of recent game plays (up to 100 entries) on your device, including:
- Game type (Coin Toss, Memory Cards, Water Sorting, or a rewarded ad)
- Timestamp of each play
- Coins earned or spent per play
- Coin toss outcome (heads/tails)

This log is used to display your game history in the Coins screen. It never leaves your device.

---

## 3. What We Do NOT Collect

The app itself (our own code) does not collect:

- ❌ Name, email address, phone number, or any personal identifier
- ❌ Location or GPS data
- ❌ Camera or microphone data
- ❌ Contacts or call logs
- ❌ Usage analytics or behavioral tracking
- ❌ Crash reports sent to any server
- ❌ Any data linked to your identity

We do not receive or have access to any data collected by the ad providers described in Section 5.3.

---

## 4. Internet Access

Tagda Fun uses the internet connection **only** to load and show ads. The app itself:
- Does not connect to any backend server of ours
- Does not sync your data to any cloud service
- Works offline for all game features (ads simply won't load without a connection)

---

## 5. Third-Party Services

### 5.1 Expo Framework
Tagda Fun is built using the Expo SDK. Expo may collect anonymized, aggregated crash and performance data to improve framework stability. This data is:
- Not linked to individual users
- Not accessible to us as the developer
- Governed by [Expo's Privacy Policy](https://expo.dev/privacy)

### 5.2 Google Play Store
When you download the app via Google Play Store, Google collects standard app store data (install counts, ratings, reviews). This is governed by [Google's Privacy Policy](https://policies.google.com/privacy) and is outside our control.

### 5.3 Unity LevelPlay (Advertising)
Tagda Fun shows banner, native, and optional rewarded video ads through **Unity LevelPlay** (formerly ironSource), an ad mediation platform. LevelPlay may route ad requests to other ad networks (for example ironSource, Google AdMob, Meta, or Unity Ads). These services may collect and use data such as:
- Your device's **advertising ID** (Google Advertising ID)
- IP address and approximate location derived from it
- Device and app information (model, OS version, app version)
- Ad interaction data (impressions, clicks, rewarded ad completions)

This data is collected by those providers for ad delivery, measurement, fraud prevention, and personalization. It is not accessible to us as the developer. See [Unity's Privacy Policy](https://unity.com/legal/privacy-policy) and [Google's Privacy Policy](https://policies.google.com/privacy).

You can opt out of ad personalization or reset your advertising ID in your device settings (Android: Settings → Privacy → Ads).

---

## 6. Children's Privacy

Tagda Fun does not knowingly collect personal data from anyone, including children under 13. The app:
- Requires no account or sign-up
- Collects no personal information
- Is safe for all ages

If you believe your child has provided personal information through this app, please contact us and we will address the concern promptly.

---

## 7. Data Security

Since all data is stored locally on your device:
- Your game data is protected by your device's own security (screen lock, encryption)
- We as the developer have no access to your device or stored data
- There is no server-side database that could be breached

---

## 8. Your Rights and Controls

You have full control over all data stored by this app:

| Action | How to do it |
|--------|-------------|
| View your data | Open the app — all data is visible in the Profile and Coins screens |
| Reset game stats | Uninstall and reinstall the app |
| Delete game history | Data is automatically removed on uninstall |
| Stop data storage | Uninstall the app |

Since we collect no personal data, there is nothing for us to provide, correct, or delete on our end.

---

## 9. App Permissions

| Permission | Why It Is Used |
|------------|---------------|
| `INTERNET` | Required to load ads |
| `AD_ID` (`com.google.android.gms.permission.AD_ID`) | Lets ad providers read the advertising ID for ad delivery and measurement |

No other permissions are requested. The app does not access your camera, microphone, contacts, location, or storage beyond its own local data.

---

## 10. Data Retention

- **Game statistics** persist on your device until you uninstall the app or reset them
- **Game history** is capped at 100 entries — oldest entries are automatically removed when the limit is reached
- **We retain no data** on any server of our own. Data held by ad providers follows their own retention policies

---

## 11. Changes to This Policy

If we make material changes to this privacy policy (for example, when adding ads or a backend), we will:
- Update the "Last Updated" date above
- Release an updated version through Google Play Store
- Note the changes in the app release notes

Continued use of the app after an update constitutes acceptance of the revised policy.

---

## 12. Contact

For any questions or concerns about this privacy policy:

**Developer:** DevmanushRaky  
**App Store Page:** [Tagda Fun on Google Play](https://play.google.com/store/apps/details?id=com.tagdafun.app)

---

## 13. Legal

Tagda Fun itself does not process personal data and has no backend. Ad providers (Section 5.3) act as independent controllers of the data they collect and are responsible for their own compliance with GDPR, CCPA, and similar regulations. We do not carry out automated decision-making or profiling ourselves.

---

*This privacy policy applies to Tagda Fun version 1.2.0 and above, published on Google Play Store.*
