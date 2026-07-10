import React from 'react';
import { Target, Heart, Sparkles, Shield, ShoppingBag, Store } from 'lucide-react';
import { MahalakLogoIcon } from './MahalakLogo';

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
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {showHeader && (
        <header className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-vibrant-purple/20 border border-vibrant-purple/30 mb-3">
            <MahalakLogoIcon size={32} />
          </div>
          <h1 className={`font-black text-white mb-1 ${compact ? 'text-lg' : 'text-2xl'}`}>
            من نحن — منصة «محلك»
          </h1>
          <p className="text-xs font-bold text-violet">سوقك الأقرب، وتجارتك الأسهل</p>
        </header>
      )}

      {aboutSections.map(({ icon: Icon, title, body }) => (
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

      <section className="bg-vibrant-purple/10 border border-vibrant-purple/25 rounded-2xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShoppingBag size={16} className="text-violet" />
          <Shield size={16} className="text-violet" />
        </div>
        <p className="text-xs font-black text-white leading-relaxed">
          في «محلك»، نحن نبني جسوراً رقمية لنجعل كل متجر قريباً منك.. وكأنك تتسوق في محلك!
        </p>
      </section>
    </div>
  );
};
