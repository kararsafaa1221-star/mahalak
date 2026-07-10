# دليل النشر والبناء — منصة محلك (Monorepo)

هذا المشروع مُقسّم إلى ثلاثة تطبيقات مستقلة + حزمة مشتركة:

```
mahalak/
├── apps/
│   ├── customer/     ← تطبيق الزبون (ويب + Android)
│   ├── merchant/     ← تطبيق التاجر (ويب + Android)
│   └── admin/        ← لوحة الإدارة (ويب فقط)
├── packages/
│   └── shared/       ← الكود المشترك (Types, Firebase, Services, Hooks)
├── functions/        ← Cloud Functions
└── firebase.json     ← إعدادات Firebase Hosting
```

---

## 1. المتطلبات

- Node.js 20+
- npm
- Android Studio (لبناء APK)
- JDK 17+
- حساب Firebase مُفعّل على مشروع `mahalak-0`

### تثبيت الاعتماديات (مرة واحدة)

```powershell
cd d:\mahalak
npm install
```

---

## 2. أوامر التطوير

| الأمر | الوصف | المنفذ |
|--------|--------|--------|
| `npm run dev:customer` | تشغيل تطبيق الزبون | 5173 |
| `npm run dev:merchant` | تشغيل تطبيق التاجر | 5175 |
| `npm run dev:admin` | تشغيل لوحة الإدارة | 5174 |

---

## 3. بناء تطبيق الزبون (Customer)

### 3.1 بناء الويب

```powershell
cd d:\mahalak
npm run build:customer
```

الناتج يُحفظ في: `apps/customer/dist/`

### 3.2 مزامنة Capacitor وتوليد مجلد Android

```powershell
npm run cap:sync:customer
```

هذا الأمر يقوم بـ:
1. بناء تطبيق الزبون
2. مزامنة الملفات مع `apps/customer/android/`

> **أول مرة؟** إذا لم يكن مجلد Android موجوداً:
> ```powershell
> cd apps/customer
> npx cap add android
> cd ..\..
> npm run cap:sync:customer
> ```

### 3.3 فتح Android Studio وبناء APK

```powershell
npm run cap:open:customer
```

في Android Studio:
1. انتظر اكتمال Gradle Sync
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. APK يظهر في: `apps/customer/android/app/build/outputs/apk/`

### 3.4 APK للإنتاج (Release)

```powershell
cd apps/customer/android
.\gradlew assembleRelease
```

APK الموقّع: `apps/customer/android/app/build/outputs/apk/release/app-release.apk`

---

## 4. بناء تطبيق التاجر (Merchant)

### 4.1 بناء الويب

```powershell
cd d:\mahalak
npm run build:merchant
```

الناتج: `apps/merchant/dist/`

### 4.2 مزامنة Capacitor

```powershell
npm run cap:sync:merchant
```

> **أول مرة؟**
> ```powershell
> cd apps/merchant
> npx cap add android
> cd ..\..
> npm run cap:sync:merchant
> ```

### 4.3 فتح Android Studio

```powershell
npm run cap:open:merchant
```

APK Debug: `apps/merchant/android/app/build/outputs/apk/debug/`

APK Release:
```powershell
cd apps/merchant/android
.\gradlew assembleRelease
```

---

## 5. بناء لوحة الإدارة (Admin)

```powershell
npm run build:admin
```

الناتج: `apps/admin/dist/`

---

## 6. بناء الكل دفعة واحدة

```powershell
npm run build
```

يبني: customer + merchant + admin

---

## 7. نشر Firebase Hosting

### 7.1 ربط أهداف Hosting (مرة واحدة)

```powershell
firebase target:apply hosting mahalak-app mahalak-0
firebase target:apply hosting mahalak-merchant mahalak-merchant
firebase target:apply hosting mahalak-admin mahalak-admin
```

> أنشئ موقع `mahalak-merchant` من Firebase Console → Hosting إذا لم يكن موجوداً.

### 7.2 البناء ثم النشر

```powershell
npm run build:customer
npm run build:merchant
npm run build:admin

firebase deploy --only hosting:mahalak-app
firebase deploy --only hosting:mahalak-merchant
firebase deploy --only hosting:mahalak-admin
```

أو نشر الكل:
```powershell
firebase deploy --only hosting
```

### 7.3 نشر القواعد والدوال

```powershell
firebase deploy --only firestore:rules,storage,functions
```

---

## 8. إعدادات Capacitor لكل تطبيق

| التطبيق | الملف | App ID | webDir |
|---------|-------|--------|--------|
| الزبون | `apps/customer/capacitor.config.ts` | `iq.mahalak.app` (Play update) | `dist` |
| التاجر | `apps/merchant/capacitor.config.ts` | `iq.mahalak.merchant` | `dist` |

كل تطبيق له مجلد Android مستقل:
- `apps/customer/android/`
- `apps/merchant/android/`

> مجلد `android/` في الجذر قديم — استخدم مجلدات التطبيقات الجديدة.

---

## 9. استيراد الكود المشترك

في أي تطبيق:

```typescript
import { useApp } from '@shared/context/useApp';
import { db } from '@shared/lib/firebase';
import type { Store } from '@shared/types';
```

---

## 10. هيكل المشروع (Clean Root)

لا يوجد `src/` في الجذر. كل الكود داخل:

- `apps/customer/src/` — تطبيق الزبون
- `apps/merchant/src/` — تطبيق التاجر
- `apps/admin/src/` — لوحة الإدارة
- `packages/shared/src/` — الكود المشترك
- `packages/shared/public/` — الأصول العامة (أيقونات، manifest)
- `config/firebase.config.json` — إعدادات Firebase

---

## 11. استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `permission-denied` على الهاتف | فعّل Anonymous Auth + انشر `firestore.rules` |
| كلمة المرور غير صحيحة | انشر `functions` + استخدم «نسيت كلمة المرور» |
| Gradle فشل | تأكد JDK 17 و Android SDK في Android Studio |
| OneSignal لا يعمل | تحقق من `config/firebase.config.json` |

---

## 12. ملخص سريع — APK الزبون

```powershell
cd d:\mahalak
npm install
npm run cap:sync:customer
npm run cap:open:customer
# في Android Studio: Build → Build APK(s)
```

## 14. القائمة الذهبية — فصل الزبون عن التاجر (Android)

```powershell
npm run verify:android
```

| # | البند | الزبون | التاجر |
|---|--------|--------|--------|
| 1 | Capacitor `appId` | `iq.mahalak.app` | `iq.mahalak.merchant` |
| 2 | `google-services.json` | `apps/customer/android/app/` | `apps/merchant/android/app/` |
| 3 | OneSignal App ID | `apps/customer/.env` | `apps/merchant/.env` |
| 4 | اسم التطبيق | محلك - زبون | محلك - تاجر |
| 5 | لون الأيقونة | أخضر `#10B981` | بنفسجي `#6366F1` |
| 6 | `versionCode` | `1` | `1` |

**تحذير:** لا تنسخ `google-services.json` من مجلد الزبون إلى التاجر.

تفاصيل Firebase: [config/android/README.md](../config/android/README.md)

قبل APK: **Build → Clean Project** في Android Studio لكل تطبيق على حدة.

---

```powershell
cd d:\mahalak
npm install
npm run cap:sync:merchant
npm run cap:open:merchant
# في Android Studio: Build → Build APK(s)
```
