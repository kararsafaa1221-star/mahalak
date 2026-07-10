import React from 'react';
import {
  Shield,
  Database,
  Trash2,
  Share2,
  User,
  Lock,
  Bell,
} from 'lucide-react';
import { MahalakLogoIcon } from './MahalakLogo';

export const PRIVACY_POLICY_LAST_UPDATED = '30 حزيران 2026';
export const PRIVACY_POLICY_PHONE = '+9647735187868';

const intro = `نحن في منصة "محلك" نلتزم التزاماً كاملاً بحماية خصوصية مستخدمينا، سواء كانوا من المتسوقين (الزبائن) أو من شركائنا (التجار). تهدف سياسة الخصوصية هذه إلى توضيح بشفافية تامة طبيعة البيانات التي نجمعها، وكيفية استخدامها، والتدابير الصارمة التي نتخذها لحمايتها عند استخدامك لتطبيقاتنا (تطبيق الزبون وتطبيق التاجر) وخدماتنا المرتبطة بها.

باستخدامك لتطبيقات "محلك"، فإنك توافق على ممارسات جمع البيانات واستخدامها الموضحة في هذه الوثيقة.`;

export const privacySections = [
  {
    icon: Database,
    title: '1. البيانات التي نقوم بجمعها',
    body: `نجمع أنواعاً مختلفة من المعلومات لتقديم خدماتنا وتحسينها، وتنقسم إلى:

أ. معلومات الحساب الشخصي (الزبائن والتجار):
الاسم الكامل، رقم الهاتف المحمول، العنوان.
للتجار: معلومات المتجر، العنوان التجاري، والمحافظ الإلكترونية لاستلام الأرباح.

ب. بيانات الموقع الجغرافي (Location Data):
نطلب إذن الوصول إلى موقعك الجغرافي (GPS) لتسهيل عمليات التوصيل، تحديد العناوين بدقة، وعرض المتاجر والمنتجات الأقرب إليك. يمكنك تعطيل هذا الإذن في أي وقت من إعدادات جهازك.

ج. المحتوى الذي يتم رفعه:
الصور، التقييمات، والمراجعات التي تشاركها عبر التطبيق. يتطلب هذا الوصول إلى معرض الصور (Gallery) أو الكاميرا بعد موافقتك الصريحة.

د. بيانات الجهاز والاستخدام:
نجمع معلومات تقنية مثل نوع الجهاز، نظام التشغيل، عنوان بروتوكول الإنترنت (IP)، ومعرفات الجهاز الفريدة لغرض حل المشاكل التقنية وتحليل أداء التطبيق.`,
  },
  {
    icon: User,
    title: '2. كيف نستخدم بياناتك؟',
    body: `يقتصر استخدامنا لبياناتك على الأغراض التالية:

• إنشاء وإدارة حسابك بشكل آمن.
• معالجة الطلبات، تتبع الشحنات، وتسهيل التواصل بين التاجر والزبون.
• معالجة المدفوعات والتسويات المالية للتجار بطريقة آمنة.
• إرسال التنبيهات والإشعارات (Push Notifications) حول حالة الطلبات، العروض الجديدة، أو التحديثات الأمنية.
• منع الاحتيال، فرض قواعد الاستخدام، وتعزيز أمان المنصة.`,
  },
  {
    icon: Share2,
    title: '3. مشاركة البيانات مع أطراف ثالثة',
    body: `نحن لا نقوم ببيع بياناتك الشخصية لأي جهة. يتم مشاركة البيانات فقط في أضيق الحدود ومع جهات موثوقة لضمان عمل التطبيق:

مزودي الخدمات السحابية: نستخدم خدمات مؤمنة (مثل Firebase من Google) لاستضافة البيانات والمصادقة.`,
  },
  {
    icon: Lock,
    title: '4. أمن وحماية البيانات',
    body: `نطبق معايير أمنية متقدمة لحماية بياناتك من الوصول غير المصرح به، أو التعديل، أو الإفشاء. تشمل هذه المعايير:

• تشفير البيانات أثناء النقل (Encryption in Transit) باستخدام بروتوكولات آمنة (SSL/TLS).
• تقييد الوصول إلى قواعد البيانات وفرض صلاحيات صارمة تضمن عدم إطلاع أي طرف على بيانات غير مصرح له بها.`,
  },
  {
    icon: Trash2,
    title: '5. حقوقك وحذف البيانات (Data Deletion)',
    body: `نمنحك السيطرة الكاملة على بياناتك. يحق لك في أي وقت:

• تعديل أو تصحيح معلوماتك الشخصية عبر لوحة إعدادات الحساب.
• حذف الحساب نهائياً: يمكنك طلب حذف حسابك وكافة بياناتك المرتبطة به مباشرة من داخل التطبيق عبر الانتقال إلى (إعدادات الحساب > حذف الحساب). بمجرد تأكيد الطلب، يتم مسح بياناتك الشخصية من خوادمنا بشكل آمن ونهائي بما يتوافق مع سياسات منصة Google Play.`,
  },
  {
    icon: Bell,
    title: '6. التعديلات على سياسة الخصوصية',
    body: `نحتفظ بالحق في تحديث سياسة الخصوصية هذه بشكل دوري لمواكبة التغييرات التقنية أو القانونية. سيتم إشعارك بأي تحديثات جوهرية عبر إشعارات التطبيق، وسيتم تحديث تاريخ "الإصدار الأخير" في أعلى هذه الصفحة.`,
  },
];

interface PrivacyPolicyContentProps {
  compact?: boolean;
  showHeader?: boolean;
}

export const PrivacyPolicyContent: React.FC<PrivacyPolicyContentProps> = ({
  compact = false,
  showHeader = true,
}) => {
  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {showHeader && (
        <header className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-vibrant-purple/20 border border-vibrant-purple/30 mb-3">
            <MahalakLogoIcon size={32} />
          </div>
          <h1 className={`font-black text-white mb-1 ${compact ? 'text-lg' : 'text-2xl'}`}>
            سياسة الخصوصية لمنصة وتطبيقات «محلك»
          </h1>
          <p className="text-xs font-bold text-violet">
            تاريخ الإصدار / التحديث الأخير: {PRIVACY_POLICY_LAST_UPDATED}
          </p>
        </header>
      )}

      <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <p className="text-xs font-bold text-slate-300 leading-relaxed whitespace-pre-line">{intro}</p>
      </section>

      {privacySections.map(({ icon: Icon, title, body }) => (
        <section
          key={title}
          className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-4"
        >
          <div className="flex items-start gap-3 mb-2">
            <div className="p-2 rounded-xl bg-vibrant-purple/20 text-violet shrink-0">
              <Icon size={16} />
            </div>
            <h2 className="font-black text-white text-sm leading-relaxed">{title}</h2>
          </div>
          <p className="text-xs font-bold text-slate-300 leading-relaxed whitespace-pre-line">{body}</p>
        </section>
      ))}

      <section className="bg-vibrant-purple/10 border border-vibrant-purple/25 rounded-2xl p-4">
        <div className="flex items-start gap-3 mb-2">
          <div className="p-2 rounded-xl bg-vibrant-purple/20 text-violet shrink-0">
            <Shield size={16} />
          </div>
          <h2 className="font-black text-white text-sm">7. التواصل معنا</h2>
        </div>
        <p className="text-xs font-bold text-slate-300 leading-relaxed">
          إذا كان لديك أي استفسار، شكوى، أو ملاحظة حول سياسة الخصوصية أو كيفية تعاملنا مع بياناتك، يرجى
          التواصل معنا عبر:
        </p>
        <p className="text-xs font-black text-white mt-2">
          رقم الهاتف:{' '}
          <a href={`tel:${PRIVACY_POLICY_PHONE}`} className="text-violet hover:underline" dir="ltr">
            {PRIVACY_POLICY_PHONE}
          </a>
        </p>
      </section>
    </div>
  );
};
