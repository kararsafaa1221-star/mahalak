# Android — Firebase google-services.json (per app)

Each native app **must** have its own `google-services.json`. Never copy the customer file into the merchant folder.

## Steps (Firebase Console)

1. Open [Firebase Console](https://console.firebase.google.com/) → project **mahalak-0**
2. **Project settings** → **Your apps** → **Add app** → **Android**
3. Register **customer**:
   - Package name: `iq.mahalak.app`
   - Download `google-services.json`
   - Save as: `apps/customer/android/app/google-services.json`
4. Register **merchant** (separate Android app in the same Firebase project):
   - Package name: `iq.mahalak.merchant`
   - Download `google-services.json`
   - Save as: `apps/merchant/android/app/google-services.json`

## Verify

```powershell
npm run verify:android
```

The script checks that each file exists and that `package_name` inside matches the app ID.

## Templates

- `google-services.customer.json.example` — structure reference for customer
- `google-services.merchant.json.example` — structure reference for merchant

Replace `REPLACE_WITH_FIREBASE_CONSOLE_VALUES` with values from Firebase Console downloads.

> **Note:** Firestore/Auth can stay on the same Firebase project (`mahalak-0`) for both apps. Separation is by **Android package name** + **OneSignal app** + **Capacitor appId**, not by duplicating the whole backend.
