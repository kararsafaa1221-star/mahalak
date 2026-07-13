import React from 'react';
import {
  Shield,
  Database,
  Trash2,
  Share2,
  User,
  Lock,
  Bell,
  Phone,
} from 'lucide-react';
import { MahalakLogoIcon } from './MahalakLogo';
import { LegalGlowCard } from './LegalGlowCard';

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
    <div
      className={`animate-fade-in font-tajawal text-right ${compact ? 'space-y-4' : 'space-y-5'}`}
      dir="rtl"
    >
      {showHeader && (
        <header className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] p-5 sm:p-6 text-white shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
          <div className="relative z-10">
            <div className="welcome-icon-pulse mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white bg-brand-horizontal border border-white shadow-brand-glow-lg">
              <MahalakLogoIcon size={compact ? 28 : 32} inverted />
            </div>
            <h1 className={`font-black text-[#fff700] mb-1.5 ${compact ? 'text-lg' : 'text-2xl'}`}>
              سياسة الخصوصية لمنصة وتطبيقات «محلك»
            </h1>
            <p className="text-[10px] sm:text-xs font-bold text-purple-100">
              تاريخ الإصدار / التحديث الأخير: {PRIVACY_POLICY_LAST_UPDATED}
            </p>
          </div>
        </header>
      )}

      <LegalGlowCard>
        <p className="text-[11px] sm:text-xs font-bold text-purple-100/90 leading-relaxed whitespace-pre-line">
          {intro}
        </p>
      </LegalGlowCard>

      {privacySections.map(({ icon: Icon, title, body }) => (
        <LegalGlowCard key={title}>
          <div className="flex items-start gap-3 mb-2.5">
            <div className="p-2.5 rounded-xl bg-white/15 border border-white/20 text-[#fff700] shrink-0 shadow-sm">
              <Icon size={16} />
            </div>
            <h2 className="font-black text-[#fff700] text-sm sm:text-base leading-relaxed pt-0.5">{title}</h2>
          </div>
          <p className="text-[11px] sm:text-xs font-bold text-purple-100/90 leading-relaxed whitespace-pre-line">
            {body}
          </p>
        </LegalGlowCard>
      ))}

      <LegalGlowCard className="text-center !bg-transparent border-white/20 shadow-brand-glow">
        <div className="flex items-center justify-center gap-2 mb-2.5">
          <div className="p-2 rounded-xl bg-white/15 border border-white/20 text-[#fff700]">
            <Shield size={16} />
          </div>
          <div className="p-2 rounded-xl bg-white/15 border border-white/20 text-[#fff700]">
            <Phone size={16} />
          </div>
        </div>
        <h2 className="font-black text-[#fff700] text-sm sm:text-base mb-2">7. التواصل معنا</h2>
        <p className="text-[11px] sm:text-xs font-bold text-purple-100/90 leading-relaxed mb-2">
          إذا كان لديك أي استفسار، شكوى، أو ملاحظة حول سياسة الخصوصية أو كيفية تعاملنا مع بياناتك، يرجى
          التواصل معنا عبر:
        </p>
        <p className="text-xs sm:text-sm font-black text-white">
          رقم الهاتف:{' '}
          <a href={`tel:${PRIVACY_POLICY_PHONE}`} className="text-[#fff700] hover:underline" dir="ltr">
            {PRIVACY_POLICY_PHONE}
          </a>
        </p>
      </LegalGlowCard>
    </div>
  );
};
