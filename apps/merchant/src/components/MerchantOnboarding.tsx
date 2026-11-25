import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Store } from '@shared/types';
import SignatureCanvas from 'react-signature-canvas';

export const MerchantOnboarding: React.FC<{
  currentMerchant: Store;
  onComplete: (data: Partial<Store>) => void;
}> = ({ currentMerchant, onComplete }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [workingHours, setWorkingHours] = useState(() => t('merchant.onboarding.workingHoursDefault'));
  const [deliveryAreas, setDeliveryAreas] = useState(() => t('merchant.onboarding.deliveryAreasDefault'));
  
  const [storeCoverType, setStoreCoverType] = useState<'image' | 'color'>('color');
  const [storeCoverValue, setStoreCoverValue] = useState('#0B1320'); // hex color or image URL
  const [isContractScrolled, setIsContractScrolled] = useState(false);
  
  const sigPad = useRef<any>(null);
  
  const handleNextStep = () => {
    if (step === 3) {
      if (sigPad.current?.isEmpty()) {
        alert(t('merchant.onboarding.signFirstAlert'));
        return;
      }
      const signature = sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
      const contractAgreedAt = new Date().toISOString();
      onComplete({
        workingHours,
        deliveryAreas,
        storeCoverType,
        storeCoverValue,
        signature,
        contractAgreedAt
      });
    } else {
      setStep(step + 1);
    }
  };

  const handleContractScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setIsContractScrolled(true);
    }
  };

  return (
    <div className="merchant-glass-screen flex items-center justify-center p-4" dir="rtl">
      <div className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow welcome-card-shimmer rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in">
        
        {/* Header Steps */}
        <div className="bg-white/5 border-b border-white/15 p-6">
           <h2 className="text-xl font-black text-white mb-4">{t('merchant.onboarding.setupTitle', { step })}</h2>
           <div className="flex gap-2">
             {[1, 2, 3].map(s => (
               <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-vibrant-purple' : 'bg-white/15'}`} />
             ))}
           </div>
        </div>

        <div className="p-8 text-white">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold text-white">{t('merchant.onboarding.step1Title')}</h3>
              <div>
                <label className="block text-sm font-bold text-white/70 mb-2">{t('merchant.onboarding.workingHoursLabel')}</label>
                <input 
                  type="text" 
                  value={workingHours}
                  onChange={e => setWorkingHours(e.target.value)}
                  className="w-full bg-white/5 border border-white/25 p-4 rounded-xl text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-vibrant-purple/40"
                  placeholder={t('merchant.onboarding.workingHoursPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-white/70 mb-2">{t('merchant.onboarding.deliveryAreasLabel')}</label>
                <input 
                  type="text" 
                  value={deliveryAreas}
                  onChange={e => setDeliveryAreas(e.target.value)}
                  className="w-full bg-white/5 border border-white/25 p-4 rounded-xl text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-vibrant-purple/40"
                  placeholder={t('merchant.onboarding.deliveryAreasPlaceholder')}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold text-white">{t('merchant.onboarding.step2Title')}</h3>
              
              <div className="flex gap-4 mb-4">
                <button 
                  onClick={() => setStoreCoverType('color')}
                  className={`flex-1 p-3 rounded-xl font-bold text-sm border-2 transition ${storeCoverType==='color' ? 'border-white bg-vibrant-purple/30 text-white' : 'border-white/20 text-white/60'}`}
                >{t('merchant.onboarding.coverColor')}</button>
                <button 
                  onClick={() => { setStoreCoverType('image'); setStoreCoverValue(''); }}
                  className={`flex-1 p-3 rounded-xl font-bold text-sm border-2 transition ${storeCoverType==='image' ? 'border-white bg-vibrant-purple/30 text-white' : 'border-white/20 text-white/60'}`}
                >{t('merchant.onboarding.coverImage')}</button>
              </div>

              {storeCoverType === 'color' && (
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-2">{t('merchant.onboarding.coverColorLabel')}</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={storeCoverValue.startsWith('#') ? storeCoverValue : '#0B1320'}
                      onChange={e => setStoreCoverValue(e.target.value)}
                      className="w-16 h-16 rounded-xl cursor-pointer"
                    />
                    <div className="text-white/60 text-sm font-mono" dir="ltr">{storeCoverValue}</div>
                  </div>
                </div>
              )}

              {storeCoverType === 'image' && (
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-2">{t('merchant.onboarding.coverImageUrlLabel')}</label>
                  <input 
                    type="url" 
                    value={storeCoverValue}
                    onChange={e => setStoreCoverValue(e.target.value)}
                    className="w-full bg-white/5 border border-white/25 p-4 rounded-xl text-sm text-left text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-vibrant-purple/40"
                    placeholder="https://..."
                    dir="ltr"
                  />
                  {storeCoverValue && (
                     <img src={storeCoverValue} alt="Cover Preview" className="mt-4 w-full h-32 object-cover rounded-xl" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold text-white">{t('merchant.onboarding.step3Title')}</h3>
              <p className="text-sm text-white/70">{t('merchant.onboarding.readTermsHint')}</p>
              
              <div 
                className="bg-white/5 border border-white/20 rounded-2xl p-4 h-48 overflow-y-auto text-sm text-white/80 leading-relaxed font-semibold transition"
                onScroll={handleContractScroll}
              >
                 <h4 className="font-bold text-[#fff700] mb-2">اتفاقية استخدام منصة محلك للتجار</h4>
                 <p className="mb-2">1. يلتزم التاجر بتوفير المنتجات المعروضة بالأسعار والمواصفات المذكورة في المتجر.</p>
                 <p className="mb-2">2. عدم بيع مواد ممنوعة قانوناً أو غير مطابقة للآداب العامة.</p>
                 <p className="mb-2">3. يلتزم التاجر بتجهيز الطلبات خلال الوقت المحدد وتغليفها بشكل آمن.</p>
                 <p className="mb-2">4. المنصة غير مسؤولة عن النزاعات المالية الناتجة عن سوء استخدام النظام.</p>
                 <p className="mb-2">5. يحق للمنصة إيقاف المتجر في حال تكرار المخالفات أو الشكاوى من الزبائن.</p>
                 <p className="mb-2">6. الاشتراكات غير قابلة للاسترداد بعد تفعيلها.</p>
                 <p className="mb-2">7. يجب أن تكون معلومات المتجر وصاحب المتجر دقيقة ويتحمل التاجر المسؤولية القانونية كاملة.</p>
                 <p className="mb-2">8. توافق على أن المعلومات التي يتم مشاركتها تخضع لسياسة الخصوصية الخاصة بالمنصة.</p>
                 <p className="mb-2">9. يجب على التاجر توفير طريقة دفع صالحة لاستلام مستحقاته.</p>
                 <p className="mb-10 text-rose-300">(مرر للأسفل للموافقة والتوقيع)</p>
                 <p className="text-white/40">--- نهاية العقد ---</p>
              </div>

              {!isContractScrolled && <p className="text-xs text-rose-300 font-bold">{t('merchant.onboarding.scrollToSignHint')}</p>}

              {isContractScrolled && (
                <div className="mt-6">
                  <label className="block text-sm font-bold text-white/70 mb-2">
                    {t('merchant.onboarding.ownerSignatureLabel')} <span className="text-rose-300">*</span>
                  </label>
                  <div className="border-2 border-dashed border-white/40 bg-white keep-white rounded-2xl overflow-hidden">
                    <SignatureCanvas 
                      ref={sigPad} 
                      penColor="black"
                      canvasProps={{ className: "w-full h-40 cursor-crosshair" }} 
                    />
                  </div>
                  <button 
                    onClick={() => sigPad.current?.clear()} 
                    className="text-xs text-white/60 hover:text-rose-300 mt-2 font-bold"
                  >
                    {t('merchant.onboarding.clearSignature')}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex gap-4">
             {step > 1 && (
               <button 
                 onClick={() => setStep(step - 1)}
                 className="flex-1 py-4 bg-white/10 border border-white/25 text-white rounded-2xl font-bold hover:bg-white/15 transition"
               >
                 {t('merchant.onboarding.back')}
               </button>
             )}
             <button 
               onClick={handleNextStep}
               disabled={step === 3 && !isContractScrolled}
               className="flex-[2] py-4 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white rounded-2xl font-bold shadow-brand-glow hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {step === 3 ? t('merchant.onboarding.agreeAndSign') : t('merchant.onboarding.next')}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
