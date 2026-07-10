import React, { useState } from 'react';
import { Store } from '@shared/types';
import { ChevronRight } from 'lucide-react';
import { MahalakLogo } from '@shared/components/MahalakLogo';

const TERMS_SECTIONS = [
  {
    title: 'القبول والالتزام',
    body: 'يوافق التاجر عند استخدام منصة "محلك" على الالتزام الكامل بهذه الشروط. أي مخالفة قد تؤدي إلى تعليق الحساب أو إنهائه.',
  },
  {
    title: 'مسؤولية التاجر',
    body: 'يلتزم التاجر بتقديم معلومات دقيقة وصحيحة عن منتجاته، وعدم عرض أي مواد محظورة قانوناً. التاجر هو المسؤول الوحيد عن عمليات البيع وجودة المنتجات والتوصيل.',
  },
  {
    title: 'الاشتراكات والأموال',
    body: 'تحدد "محلك" رسوم اشتراك حسب الخطة المختارة، ويتم تحويل المستحقات المالية للتاجر بعد خصم عمولات المنصة وأكواد الخصم المطبقة.',
  },
  {
    title: 'الخصوصية والبيانات',
    body: 'تلتزم "محلك" بحماية بيانات التاجر والعملاء. لا يحق للتاجر استخدام بيانات العملاء لأغراض خارج نطاق معالجة طلباتهم عبر المنصة.',
  },
  {
    title: 'إنهاء الخدمة',
    body: 'يحق لـ "محلك" إنهاء أو تعليق حساب أي تاجر في حال ثبوت الاحتيال، كثرة الشكاوى، مخالفة الشروط، أو أي نشاط يضر بسمعة المنصة.',
  },
];

export const MerchantTermsAgreement: React.FC<{
  currentMerchant: Store;
  onAccept: () => void | Promise<void>;
  isSaving?: boolean;
}> = ({ currentMerchant, onAccept, isSaving = false }) => {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setHasScrolledToEnd(true);
    }
  };

  return (
    <div className="min-h-screen bg-mahalak-gradient flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3 mb-2">
            <MahalakLogo className="h-10 w-10 shrink-0 object-contain" />
            <div>
              <h1 className="text-xl font-black text-slate-800">شروط استخدام منصة محلك</h1>
              <p className="text-xs text-slate-500 mt-1">
                {currentMerchant.shopName} · @{currentMerchant.username}
              </p>
            </div>
          </div>
          <p className="text-sm text-amber-700 font-bold bg-amber-50 border border-amber-100 rounded-xl p-3">
            حسابك يحتاج قبول الشروط المحدّثة قبل متابعة استخدام لوحة التاجر.
          </p>
        </div>

        <div
          className="p-6 max-h-[50vh] overflow-y-auto text-sm text-slate-600 leading-relaxed space-y-5"
          onScroll={handleScroll}
        >
          {TERMS_SECTIONS.map((section, index) => (
            <div key={section.title} className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-vibrant-purple/10 text-vibrant-purple flex items-center justify-center font-bold">
                {index + 1}
              </div>
              <div>
                <p className="font-bold text-slate-800 mb-1">{section.title}</p>
                <p>{section.body}</p>
              </div>
            </div>
          ))}

          <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200">
            <p className="font-black text-slate-800 mb-2">عقد التاجر الإلكتروني</p>
            <p className="text-[13px]">
              بالضغط على "أوافق وأتابع" أنت تقر بقراءة الشروط وتعتبر موافقتك توقيعاً إلكترونياً ملزماً
              على كافة البنود بين منصة محلك والتاجر {currentMerchant.ownerName || currentMerchant.shopName}.
            </p>
          </div>
        </div>

        {!hasScrolledToEnd && (
          <p className="px-6 pb-2 text-xs text-rose-500 font-bold">
            يرجى قراءة الشروط وتمريرها للأسفل بالكامل لتتمكن من الموافقة.
          </p>
        )}

        <div className="p-6 border-t border-slate-100 bg-white">
          <button
            type="button"
            disabled={!hasScrolledToEnd || isSaving}
            onClick={() => void onAccept()}
            className="w-full py-4 bg-vibrant-purple text-white font-black text-lg rounded-xl shadow-md hover:bg-violet transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>{isSaving ? 'جاري الحفظ...' : 'أوافق على الشروط وأتابع'}</span>
            {!isSaving && <ChevronRight size={20} className="rotate-180" />}
          </button>
        </div>
      </div>
    </div>
  );
};
