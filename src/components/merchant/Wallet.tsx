import React, { useState } from 'react';
import { Store, PayoutRequest } from '../../../types';
import { Wallet as WalletIcon, ArrowUpRight, Clock, CheckCircle } from 'lucide-react';
import { AppContext } from '../../context/AppContext';

export const Wallet: React.FC<{
  currentMerchant: Store;
}> = ({ currentMerchant }) => {
  const { requestPayout, payoutRequests } = React.useContext(AppContext);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  const balance = currentMerchant.walletBalance || 0;
  
  // Filter only current merchant's payout requests
  const myRequests = payoutRequests.filter(r => r.merchantId === currentMerchant.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount, 10);
    if (!amount || isNaN(amount) || amount < 5000) {
      alert("الحد الأدنى للسحب هو 5000 د.ع");
      return;
    }
    if (amount > balance) {
      alert("الرصيد غير كافٍ.");
      return;
    }
    
    // Check if payout methods exist
    if (!currentMerchant.payoutMethods?.zainCashNumber && !currentMerchant.payoutMethods?.mastercardNumber) {
      alert("يرجى إضافة طريقة دفع (زين كاش أو ماستركارد) في ملفك الشخصي أولاً.");
      return;
    }

    const methodUsed = currentMerchant.payoutMethods.zainCashNumber ? 'zain_cash' : 'mastercard';
    const methodDetails = currentMerchant.payoutMethods.zainCashNumber || currentMerchant.payoutMethods.mastercardNumber || '';

    requestPayout(amount, methodUsed, methodDetails)
      .then(() => {
        alert("تم إرسال طلب السحب بنجاح.");
        setShowWithdrawModal(false);
        setWithdrawAmount('');
      })
      .catch(e => {
        alert("حدث خطأ أثناء الطلب.");
      });
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Balance Card */}
      <div className="bg-gradient-to-l from-[#4D2980] to-[#9952FF] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-1/3 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6 opacity-90">
            <WalletIcon size={24} />
            <h2 className="text-xl font-bold">المحفظة المالية</h2>
          </div>
          
          <div className="mb-8">
            <p className="text-sm mb-1 opacity-80">الرصيد القابل للسحب</p>
            <h3 className="text-4xl lg:text-5xl font-black font-mono tracking-tight cursor-default">
              {balance.toLocaleString()} <span className="text-xl opacity-80 font-bold font-sans">د.ع</span>
            </h3>
          </div>
          
          <div className="w-full">
            <button 
              onClick={() => setShowWithdrawModal(true)}
              className="bg-white text-[#4D2980] px-6 py-3 w-full rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition active:scale-95 shadow-md"
            >
              <ArrowUpRight size={18} />
              <span>سحب الأرباح</span>
            </button>
            <p className="text-white/80 text-[10px] mt-2 font-semibold text-center leading-relaxed">
              عند طلب سحب الاموال ستصلك خلال 5 دقائق..واذا حصل تأخير تواصل مع الدعم الفني
            </p>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-6">سجل طلبات السحب</h3>
        
        {myRequests.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-bold">
            لا توجد نشاطات سحب سابقة.
          </div>
        ) : (
          <div className="space-y-4">
            {myRequests.map(req => (
              <div key={req.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl">
                 <div>
                   <div className="font-bold text-slate-800 text-lg mb-1" dir="ltr">{req.requestedAmount.toLocaleString()} د.ع</div>
                   <div className="text-xs text-slate-500 font-mono" dir="ltr">{new Date(req.createdAt).toLocaleString('en-GB')}</div>
                 </div>
                 <div>
                   {req.status === 'pending' ? (
                     <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg text-sm font-bold border border-amber-200">
                       <Clock size={16} />
                       <span>قيد المعالجة</span>
                     </div>
                   ) : (
                     <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-bold border border-emerald-200">
                       <CheckCircle size={16} />
                       <span>مكتمل</span>
                     </div>
                   )}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowWithdrawModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-lg">سحب رصيد</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-slate-400 hover:text-rose-500 transition font-bold text-xl">&times;</button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">المبلغ المطلوب سحبه (د.ع)</label>
                <input 
                  type="number" 
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  className="w-full border-2 border-slate-200 focus:border-[#9952FF] p-4 rounded-2xl text-lg font-mono outline-none transition text-left"
                  placeholder="مثال: 50000"
                  dir="ltr"
                />
                <p className="text-xs text-slate-400 mt-2">الحد الأدنى للسحب هو 5000 د.ع</p>
              </div>

              {(!currentMerchant.payoutMethods?.zainCashNumber && !currentMerchant.payoutMethods?.mastercardNumber) && (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-200">
                  ⚠️ يجب إضافة طريقة دفع (زين كاش أو ماستركارد) في صفحة "حسابي" لتتمكن من السحب.
                </div>
              )}
              {(currentMerchant.payoutMethods?.zainCashNumber || currentMerchant.payoutMethods?.mastercardNumber) && (
                 <div className="p-4 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold border border-slate-200">
                   سيتم تحويل المبلغ إلى: 
                   <span className="text-[#9952FF] mr-2" dir="ltr">
                     {currentMerchant.payoutMethods.zainCashNumber ? 
                        `ZainCash (${currentMerchant.payoutMethods.zainCashNumber})` : 
                        `MasterCard (${currentMerchant.payoutMethods.mastercardNumber})`}
                   </span>
                 </div>
              )}

              <button 
                onClick={handleWithdraw}
                disabled={!withdrawAmount || parseInt(withdrawAmount, 10) < 5000 || (!currentMerchant.payoutMethods?.zainCashNumber && !currentMerchant.payoutMethods?.mastercardNumber)}
                className="w-full bg-[#9952FF] hover:bg-[#8640E6] text-white p-4 rounded-xl font-bold transition disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
              >
                تأكيد طلب السحب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
