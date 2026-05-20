# إعداد أيقونة التطبيق في Android Studio

## الخطوات:

### 1. بناء المشروع
```bash
npm run build
npx cap sync android
```

### 2. فتح Android Studio
```bash
npx cap open android
```

### 3. إضافة الأيقونة في Android Studio

1. في Android Studio، افتح مجلد `app > res`
2. انقر بزر الماوس الأيمن على `res` → `New` → `Image Asset`
3. اختر `Launcher Icons (Adaptive and Legacy)`
4. في `Path` اختر ملف `public/icon.png`
5. اضبط `Background Layer` بلون `#6B21A8` (البنفسجي)
6. اضغط `Next` ثم `Finish`

### 4. تشغيل التطبيق
- وصل هاتفك أو افتح المحاكي
- اضغط على زر التشغيل (▶️) في Android Studio

## 🛠️ حل مشاكل الاتصال (Network & OTP Issues)

إذا لم تصل رسائل الـ OTP في تطبيق الأندرويد، اتبع الخطوات التالية:

### 1. إضافة صلاحيات الإنترنت (Internet Permissions)
افتح الملف التالي في Android Studio:
`app > src > main > AndroidManifest.xml`

تأكد من وجود الأسطر التالية قبل وسم `<application>`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 2. السماح بالاتصال بـ API خارجي (Cleartext Traffic)
داخل نفس الملف `AndroidManifest.xml` وفي وسم `<application>`، أضف الخاصية التالية:
```xml
<application
    ...
    android:usesCleartextTraffic="true"
    ...>
```

### 3. متغيرات البيئة (Environment Variables)
عند بناء التطبيق لنسخة الإنتاج (APK)، يجب ضبط رابط السيرفر الخاص بك:
1. أنشئ ملف `.env.production` في جذر المشروع.
2. أضف الرابط الفعلي للسيرفر الخاص بك (Cloud Run):
```env
VITE_API_BASE_URL=https://your-app-url.run.app
```
3. أعد البناء والمزامنة: `npm run build && npx cap sync android`

## ملاحظة:
الأيقونة الأصلية موجودة في:
- `public/icon.png` - للويب والـ PWA
- `public/manifest.json` - إعدادات PWA

عند تحويله لـ Android، Android Studio يولد الأيقونات بجميع الأحجام المطلوبة تلقائياً.
