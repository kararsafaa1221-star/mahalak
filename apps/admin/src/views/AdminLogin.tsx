import React, { useState } from 'react';
import { useApp } from '../context/useApp';
import { Shield, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { adminLogin } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await adminLogin(email.trim(), password);
      if (!result.success) {
        setError(result.message);
      }
    } catch {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0B1320] text-white flex items-center justify-center p-4 relative overflow-hidden"
      dir="rtl"
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[#7B3DFF]/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-[#B18CFF]/6 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[#7B3DFF] to-[#B18CFF] shadow-[0_0_40px_rgba(123,61,255,0.4)] mb-5">
            <Shield size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white font-arabic">لوحة إدارة محلك</h1>
          <p className="text-slate-400 text-sm mt-1 font-arabic">للمسؤولين المعتمدين فقط</p>
        </div>

        {/* Card */}
        <div className="bg-[#131C2E] border border-[#7B3DFF]/15 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-black text-slate-400 mb-1.5 font-arabic">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                  className="w-full bg-[#0B1320] border border-[#7B3DFF]/20 text-white placeholder-slate-600 rounded-xl pr-9 pl-4 py-3 text-sm font-arabic focus:outline-none focus:border-[#7B3DFF]/60 focus:ring-1 focus:ring-[#7B3DFF]/40 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-black text-slate-400 mb-1.5 font-arabic">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-[#0B1320] border border-[#7B3DFF]/20 text-white placeholder-slate-600 rounded-xl pr-9 pl-10 py-3 text-sm font-arabic focus:outline-none focus:border-[#7B3DFF]/60 focus:ring-1 focus:ring-[#7B3DFF]/40 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-bold p-3 rounded-xl font-arabic">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-l from-[#7B3DFF] to-[#B18CFF] hover:from-[#682edf] hover:to-[#9b77ff] text-white font-black rounded-xl shadow-[0_4px_20px_rgba(123,61,255,0.35)] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-arabic"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>جاري التحقق...</span>
                </>
              ) : (
                <>
                  <Shield size={18} />
                  <span>دخول لوحة الإدارة</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security notice */}
        <p className="text-center text-slate-600 text-xs mt-4 font-arabic">
          🔒 هذه الصفحة محمية ومخصصة للمسؤولين فقط
        </p>
      </div>
    </div>
  );
};
