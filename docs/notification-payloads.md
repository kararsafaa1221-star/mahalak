# هيكل الـ JSON Payload للـ Backend (FCM)

لكي تعمل الإشعارات بالشكل المطلوب في الخلفية (Background) وعندما يكون التطبيق مغلقاً تماماً (Killed State)، يجب إرسال الإشعار من الـ Backend باستخدام هيكلية محددة عبر بروتوكول FCM v1.

## القاعدة العامة للإشعارات عبر Capacitor
- الإشعارات التي تحتوي على الـ `notification` block مع الـ `android_channel_id` سيتم التعامل معها من قبل نظام التشغيل مباشرة لإظهار التنبيه (حتى لو كان التطبيق مغلقاً).
- الـ `data` block يمكن أن يحمل بيانات العرض داخل التطبيق، أو نوع الإشعار للتوجيه (Routing).

---

### 1️⃣ الإشعار الصوتي (Audio Notification)
**الحالات:**
* الزبون: قبول أو رفض الطلب، إطلاق بروموكود جديد، نشر منتجات جديدة، كافة الإشعارات العامة من الإدارة.
* التاجر: وصول طلب جديد، كافة الإشعارات والتوجيهات من الإدارة.

**الـ JSON Payload:**
```json
{
  "message": {
    "token": "DEVICE_FCM_TOKEN",
    "notification": {
      "title": "محلك",
      "body": "لديك طلب جديد من الزبون محمد! 🚀"
    },
    "android": {
      "priority": "high",
      "notification": {
        "channel_id": "mahalak_audio_channel",
        "sound": "default",
        "click_action": "FCM_PLUGIN_ACTIVITY"
      }
    },
    "data": {
      "type": "new_order",
      "targetId": "ord_12345",
      "action": "open_order_details"
    }
  }
}
```

---

### 2️⃣ الإشعار الصامت (Silent Notification)
**الحالات:**
* الزبون: تغير حالة الطلب إلى (قيد التجهيز) أو (عند المندوب).
* التاجر: قيام الزبون بتقييم المتجر، قيام الزبون بمتابعة المتجر.

**الـ JSON Payload:**
```json
{
  "message": {
    "token": "DEVICE_FCM_TOKEN",
    "notification": {
      "title": "محلك",
      "body": "قام الزبون أحمد بمتابعة متجرك."
    },
    "android": {
      "priority": "normal",
      "notification": {
        "channel_id": "mahalak_silent_channel",
        "sound": "",
        "click_action": "FCM_PLUGIN_ACTIVITY"
      }
    },
    "data": {
      "type": "store_followed",
      "targetId": "cust_987",
      "action": "open_followers"
    }
  }
}
```

### ملاحظات برمجية هامة للـ Backend:
1. **Title:** يجب أن يكون `title` داخل الـ `notification` دائماً هو `"محلك"` كما طلبت لتطابق الهوية العامة.
2. **Channel ID:** هو المسؤول الأول عن تشغيل الصوت أو جعله صامتاً.
3. Priority:
   * `"high"` للإشعارات الصوتية لضمان استيقاظ الجهاز من وضع السكون (Doze Mode).
   * `"normal"` للإشعارات الصامتة، حيث يتم عرض الإشعار لكنه لا يوقظ الجهاز بشكل مزعج.
4. **click_action:** يجب أن تحتوي على `"FCM_PLUGIN_ACTIVITY"` لكي يستطيع إضافة Capacitor Push Notifications تتبع الحدث عند قيام المستخدم بالنقر على الإشعار وفتح التطبيق.
