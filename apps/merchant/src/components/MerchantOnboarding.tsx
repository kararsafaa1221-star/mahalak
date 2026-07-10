import React, { useState, useRef } from 'react';
import { Store } from '@shared/types';
import SignatureCanvas from 'react-signature-canvas';

export const MerchantOnboarding: React.FC<{
  currentMerchant: Store;
  onComplete: (data: Partial<Store>) => void;
}> = ({ currentMerchant, onComplete }) => {
  const [step, setStep] = useState(1);
  const [workingHours, setWorkingHours] = useState('من 9 صباحاً حتى 10 مساءً');
  const [deliveryAreas, setDeliveryAreas] = useState('كافة مناطق بغداد');
  
  const [storeCoverType, setStoreCoverType] = useState<'image' | 'color'>('color');
  const [storeCoverValue, setStoreCoverValue] = useState('#0B1320'); // hex color or image URL
  const [isContractScrolled, setIsContractScrolled] = useState(false);
  
  const sigPad = useRef<any>(null);
  
  const handleNextStep = () => {
    if (step === 3) {
      if (sigPad.current?.isEmpty()) {
        alert("يرجى توقيع العقد أولاً");
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
    <div className="min-h-screen bg-mahalak-gradient flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in border border-slate-100">
        
        {/* Header Steps */}
        <div className="bg-slate-50 border-b border-slate-100 p-6">
           <h2 className="text-xl font-black text-slate-800 mb-4">إعداد متجرك (الخطوة {step} من 3)</h2>
           <div className="flex gap-2">
             {[1, 2, 3].map(s => (
               <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-vibrant-purple' : 'bg-slate-200'}`} />
             ))}
           </div>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800">بيانات التشغيل الأساسية</h3>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">أوقات وأيام العمل</label>
                <input 
                  type="text" 
                  value={workingHours}
                  onChange={e => setWorkingHours(e.target.value)}
                  className="w-full border border-slate-200 p-4 rounded-xl text-sm"
                  placeholder="مثال: من السبت إلى الخميس (9 الصبح - 10 بالليل)"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">مناطق التوصيل المتوفرة</label>
                <input 
                  type="text" 
                  value={deliveryAreas}
                  onChange={e => setDeliveryAreas(e.target.value)}
                  className="w-full border border-slate-200 p-4 rounded-xl text-sm"
                  placeholder="مثال: كافة مناطق بغداد والمحافظات"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800">الهوية البصرية للمتجر</h3>
              
              <div className="flex gap-4 mb-4">
                <button 
                  onClick={() => setStoreCoverType('color')}
                  className={`flex-1 p-3 rounded-xl font-bold text-sm border-2 transition ${storeCoverType==='color' ? 'border-vibrant-purple text-vibrant-purple bg-purple-50' : 'border-slate-100 text-slate-500'}`}
                >لون ثابت</button>
                <button 
                  onClick={() => { setStoreCoverType('image'); setStoreCoverValue(''); }}
                  className={`flex-1 p-3 rounded-xl font-bold text-sm border-2 transition ${storeCoverType==='image' ? 'border-vibrant-purple text-vibrant-purple bg-purple-50' : 'border-slate-100 text-slate-500'}`}
                >صورة غلاف (رابط)</button>
              </div>

              {storeCoverType === 'color' && (
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-2">اختر لون الغلاف</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={storeCoverValue.startsWith('#') ? storeCoverValue : '#0B1320'}
                      onChange={e => setStoreCoverValue(e.target.value)}
                      className="w-16 h-16 rounded-xl cursor-pointer"
                    />
                    <div className="text-slate-500 text-sm font-mono" dir="ltr">{storeCoverValue}</div>
                  </div>
                </div>
              )}

              {storeCoverType === 'image' && (
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-2">رابط صورة الغلاف</label>
                  <input 
                    type="url" 
                    value={storeCoverValue}
                    onChange={e => setStoreCoverValue(e.target.value)}
                    className="w-full border border-slate-200 p-4 rounded-xl text-sm text-left"
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
              <h3 className="text-lg font-bold text-slate-800">التوقيع على العقد الإلكتروني</h3>
              <p className="text-sm text-slate-500">يرجى قراءة الشروط بالكامل والتوقيع أدناه.</p>
              
              <div 
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 h-48 overflow-y-auto text-sm text-slate-600 leading-relaxed font-semibold transition"
                onScroll={handleContractScroll}
              >
                 <h4 className="font-bold text-black mb-2">اتفاقية استخدام منصة محلك للتجار</h4>
                 <p className="mb-2">1. يلتزم التاجر بتوفير المنتجات المعروضة بالأسعار والمواصفات المذكورة في المتجر.</p>
                 <p className="mb-2">2. عدم بيع مواد ممنوعة قانوناً أو غير مطابقة للآداب العامة.</p>
                 <p className="mb-2">3. يلتزم التاجر بتجهيز الطلبات خلال الوقت المحدد وتغليفها بشكل آمن.</p>
                 <p className="mb-2">4. المنصة غير مسؤولة عن النزاعات المالية الناتجة عن سوء استخدام النظام.</p>
                 <p className="mb-2">5. يحق للمنصة إيقاف المتجر في حال تكرار المخالفات أو الشكاوى من الزبائن.</p>
                 <p className="mb-2">6. الاشتراكات غير قابلة للاسترداد بعد تفعيلها.</p>
                 <p className="mb-2">7. يجب أن تكون معلومات المتجر وصاحب المتجر دقيقة ويتحمل التاجر المسؤولية القانونية كاملة.</p>
                 <p className="mb-2">8. توافق على أن المعلومات التي يتم مشاركتها تخضع لسياسة الخصوصية الخاصة بالمنصة.</p>
                 <p className="mb-2">9. يجب على التاجر توفير طريقة دفع صالحة لاستلام مستحقاته.</p>
                 <p className="mb-10 text-rose-500">(مرر للأسفل للموافقة والتوقيع)</p>
                 <p className="text-slate-400">--- نهاية العقد ---</p>
              </div>

              {!isContractScrolled && <p className="text-xs text-rose-500 font-bold">يرجى قراءة العقد وتمريره للأسفل بالكامل لتتمكن من التوقيع.</p>}

              {isContractScrolled && (
                <div className="mt-6">
                  <label className="block text-sm font-bold text-slate-500 mb-2">توقيع المالك <span className="text-rose-500">*</span></label>
                  <div className="border-2 border-dashed border-vibrant-purple bg-white rounded-2xl overflow-hidden">
                    <SignatureCanvas 
                      ref={sigPad} 
                      penColor="black"
                      canvasProps={{ className: "w-full h-40 cursor-crosshair" }} 
                    />
                  </div>
                  <button 
                    onClick={() => sigPad.current?.clear()} 
                    className="text-xs text-slate-500 hover:text-rose-500 mt-2 font-bold"
                  >
                    مسح التوقيع وإعادة الرسم
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex gap-4">
             {step > 1 && (
               <button 
                 onClick={() => setStep(step - 1)}
                 className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition"
               >
                 رجوع
               </button>
             )}
             <button 
               onClick={handleNextStep}
               disabled={step === 3 && !isContractScrolled}
               className="flex-[2] py-4 bg-vibrant-purple text-white rounded-2xl font-bold shadow-md hover:bg-violet transition disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {step === 3 ? 'أوافق وأوقع' : 'التالي'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
