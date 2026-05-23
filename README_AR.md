# محلك Mahalak

مشروع React + Vite + Tailwind CSS جاهز للفتح في Visual Studio Code، ومجهز للتحويل الى تطبيق Android عبر Capacitor وAndroid Studio.

## التشغيل داخل Visual Studio Code

1. افتح مجلد المشروع داخل VS Code.
2. افتح Terminal داخل VS Code.
3. ثبت الحزم اذا لم تكن مثبتة:

```bash
npm install
```

4. شغل نسخة التطوير:

```bash
npm run dev
```

5. ابن نسخة الانتاج:

```bash
npm run build
```

## التحويل الى Android Studio

المشروع مجهز بملف `capacitor.config.ts`، وبعد بناء المشروع نفذ:

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

بعدها سيفتح Android Studio وفيه مشروع الاندرويد، ويمكنك تشغيل التطبيق على محاكي او جهاز حقيقي.

## عند تعديل الكود لاحقا

بعد اي تعديل داخل React نفذ:

```bash
npm run build
npx cap sync android
```

ثم افتح Android Studio وشغل التطبيق من جديد.

## ربط Firebase

المشروع مرتبط بـ Firebase لحفظ البيانات بشكل دائم. يتم تحميل الإعدادات تلقائياً من ملف `firebase-applet-config.json`.

للتشغيل محلياً بشكل كامل، تأكد من إعداد مفاتيح Firebase في ملف `.env`:

```bash
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

## ملفات مهمة

- `src/App.tsx`: نقطة دخول التطبيق والتنقل بين تطبيق التاجر والزبون والادمن.
- `src/context/AppContext.tsx`: قاعدة البيانات التجريبية والمنطق العام.
- `src/views/Merchant/MerchantApp.tsx`: لوحة التاجر.
- `src/views/Customer/CustomerApp.tsx`: تطبيق الزبون.
- `src/views/Admin/AdminPanel.tsx`: لوحة الادمن.
- `src/components/ImageUploader.tsx`: رفع صور اللوغو والمنتجات.
- `src/components/LocationPicker.tsx`: تحديد الموقع GPS وخريطة جوجل.
- `capacitor.config.ts`: اعدادات اندرويد.

## بيانات الدخول التجريبية

- الادمن: كلمة المرور `admin123`
- التاجر: رقم الهاتف `07701234567`
- الزبون: رقم الهاتف `07509876543`

## ملاحظة مهمة

البيانات الحالية تجريبية داخل الواجهة فقط. عند تحويل المشروع الى منتج حقيقي يجب ربطه مع Firebase او Backend API لحفظ الحسابات والطلبات والصور بشكل دائم.