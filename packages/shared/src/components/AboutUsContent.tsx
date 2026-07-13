import React from 'react';
import { Target, Heart, Sparkles, Shield, ShoppingBag, Store } from 'lucide-react';
import { MahalakLogoIcon } from './MahalakLogo';
import { LegalGlowCard } from './LegalGlowCard';

export const aboutSections = [
  {
    icon: Heart,
    title: 'من نحن',
    body: `"محلك".. سوقك الأقرب، وتجارتك الأسهل.

"محلك" هي منصة تجارة إلكترونية عراقية رائدة، صُممت خصيصاً لتكون حلقة الوصل الأمثل بين التجار المحليين والزبائن. نحن لسنا مجرد تطبيق تسوق تقليدي، بل نحن مجتمع تجاري رقمي متكامل يهدف إلى إعادة صياغة تجربة البيع والشراء عبر الإنترنت لتصبح أكثر سهولة، أماناً، وتفاعلية.

انطلقنا من فهمنا العميق لاحتياجات السوق المحلي، لنقدم حلاً تقنياً متطوراً يخدم طرفي المعادلة التجارية: التاجر الذي يبحث عن نافذة رقمية احترافية لعرض منتجاته وإدارة مبيعاته، والزبون الذي يبحث عن تجربة تسوق ممتعة وموثوقة من متاجره المفضلة.`,
  },
  {
    icon: Target,
    title: 'رؤيتنا',
    body: `نسعى لأن نكون المنصة الأولى والوجهة الأكثر ثقة في قطاع التجارة الإلكترونية محلياً، من خلال تمكين أصحاب المتاجر من توسيع نطاق أعمالهم رقمياً، وتزويد المتسوقين بتجربة استثنائية تواكب أحدث تقنيات التسوق الذكي.`,
  },
  {
    icon: Sparkles,
    title: 'رسالتنا',
    body: `توفير بيئة تجارية آمنة وشفافة، تتيح للتاجر إدارة متجره الإلكتروني بكفاءة عالية، وتمنح الزبون القدرة على اكتشاف المنتجات، التفاعل معها، وطلبها بخطوات بسيطة وسريعة.`,
  },
  {
    icon: Store,
    title: 'ما الذي يميز منصة «محلك»؟',
    body: `• منظومة متكاملة (تطبيق التاجر وتطبيق الزبون): نقدم نظاماً مزدوجاً يمنح كل طرف أدواته الخاصة. لوحة تحكم متكاملة للتاجر لإدارة الطلبات والمنتجات، وواجهة سلسة للزبون للتسوق والمتابعة.

• تجربة تسوق تفاعلية: نتيح للتجار عرض منتجاتهم بطريقة جذابة، مما يمنح الزبون تجربة تسوق رائعة.

• أمان وموثوقية عالية: نضع حماية بيانات مستخدمينا في قمة أولوياتنا، معتمدين على أحدث معايير التشفير التقنية لضمان خصوصية معلومات الحسابات والطلبات.

• مصممة للتجارة الفعلية: «محلك» هي منصة مخصصة حصرياً لخدمة تجار التجزئة والزبائن الفعليين، لضمان بيئة تسوق خالية من التعقيدات وموجهة مباشرة نحو البيع والشراء.`,
  },
];

interface AboutUsContentProps {
  compact?: boolean;
  showHeader?: boolean;
}

export const AboutUsContent: React.FC<AboutUsContentProps> = ({
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
              من نحن — منصة «محلك»
            </h1>
            <p className="text-[10px] sm:text-xs font-bold text-purple-100">
              سوقك الأقرب، وتجارتك الأسهل
            </p>
          </div>
        </header>
      )}

      {aboutSections.map(({ icon: Icon, title, body }) => (
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
            <ShoppingBag size={16} />
          </div>
          <div className="p-2 rounded-xl bg-white/15 border border-white/20 text-[#fff700]">
            <Shield size={16} />
          </div>
        </div>
        <p className="text-xs sm:text-sm font-black text-white leading-relaxed">
          في «محلك»، نحن نبني جسوراً رقمية لنجعل كل متجر قريباً منك.. وكأنك تتسوق في محلك!
        </p>
      </LegalGlowCard>
    </div>
  );
};
