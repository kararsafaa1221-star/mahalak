// =======================================================
// Required Dependencies Installation Commands:
// npm install @imgly/background-removal firebase lucide-react
// =======================================================

import React, { useState, useRef } from 'react';
import { removeBackground } from '@imgly/background-removal';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload, Camera, Sparkles, Check, AlertCircle, RefreshCw, Eye, Image as ImageIcon } from 'lucide-react';

// Interfaces
interface ProductUploaderProps {
  onUploadSuccess: (downloadUrl: string) => void;
  onUploadError?: (error: Error) => void;
  folderPath?: string; // e.g. "products"
}

/**
 * Robust Client-Side Resizing to protect browser memory (WASM) 
 * from crashing due to high-resolution mobile photos.
 */
const resizeImageToBlob = (file: File, maxWidth = 800, maxHeight = 800): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not create Canvas 2D context.'));
          return;
        }

        // Calculate aspect-ratio dimensions
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas image to Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob conversion failed.'));
            }
          },
          'image/png', // Output PNG to preserve transparency support
          0.9
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image into DOM Element.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.readAsDataURL(file);
  });
};

export const ProductUploader: React.FC<ProductUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
  folderPath = 'products',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Pipeline Step State
  const [currentStep, setCurrentStep] = useState<'idle' | 'resizing' | 'bg-removing' | 'uploading' | 'completed'>('idle');
  
  // Image URL / Meta States
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Trigger Native File Input Choice (Camera / Gallery via HTML5)
  const triggerFileInput = () => {
    setErrorMsg(null);
    fileInputRef.current?.click();
  };

  // Main Processing and Safe Upload Pipeline
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setOriginalFile(file);
    setErrorMsg(null);
    setProgressPercentage(0);

    try {
      // Step 1: Client-Side Resizing (Protects WASM heap memory from out-of-memory errors)
      setCurrentStep('resizing');
      const resizedBlob = await resizeImageToBlob(file, 800, 800);

      // Step 2: Client-side Native Background Removal
      setCurrentStep('bg-removing');
      const outputBlob = await removeBackground(resizedBlob, {
        progress: (_key, current, total) => {
          const percentage = Math.round((current / total) * 100);
          setProgressPercentage(percentage);
        },
      });

      // Show immediate local preview
      const localResultUrl = URL.createObjectURL(outputBlob);
      setProcessedImageUrl(localResultUrl);

      // Step 3: Secure Upload to Firebase Storage
      setCurrentStep('uploading');
      const storage = getStorage();
      const fileExtension = 'png'; // Preserves transparency
      const uniqueFileName = `${Date.now()}_optimized.${fileExtension}`;
      const storageRef = ref(storage, `${folderPath}/${uniqueFileName}`);

      await uploadBytes(storageRef, outputBlob, { contentType: 'image/png' });
      const downloadUrl = await getDownloadURL(storageRef);

      // Success Hooks
      setCurrentStep('completed');
      onUploadSuccess(downloadUrl);
    } catch (err: any) {
      console.error('Core Background Removal & Upload Pipeline Error:', err);
      const errorMessage = err?.message || 'Failed processing or uploading. Please try another image.';
      setErrorMsg(errorMessage);
      setCurrentStep('idle');
      if (onUploadError) {
        onUploadError(err);
      }
    }
  };

  // Reset Component State to start fresh
  const handleReset = () => {
    setOriginalFile(null);
    setProcessedImageUrl(null);
    setProgressPercentage(0);
    setErrorMsg(null);
    setCurrentStep('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-slate-100 rounded-3xl p-6 shadow-xl font-sans" dir="rtl">
      {/* Hidden Native Chooser */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header Info */}
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-[#9952FF] shadow-sm">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">تجهيز ومُعالجة صور المنتجات</h3>
            <p className="text-xs text-slate-400 font-bold">تفريغ تلقائي بالذكاء الاصطناعي مع ضغط ذكي فوري</p>
          </div>
        </div>
        {currentStep === 'completed' && (
          <button
            onClick={handleReset}
            className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-500 font-black px-3 py-1.5 rounded-xl border border-slate-200/50 transition flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>صورة جديدة</span>
          </button>
        )}
      </div>

      {/* Error Indicator Box */}
      {errorMsg && (
        <div className="mb-5 bg-rose-50 border border-rose-100/80 p-4 rounded-2xl text-rose-600 text-xs font-bold leading-relaxed flex gap-2.5 items-start">
          <AlertCircle size={18} className="shrink-0 text-rose-500 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-rose-800">حدث خطأ أثناء المعالجة:</span>
            <p className="font-medium text-[11px] leading-normal">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Main Flow Canvas Rendering */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 min-h-[300px] flex flex-col items-center justify-center p-6 text-center">
        
        {/* STEP IDLE: Initial State Trigger */}
        {currentStep === 'idle' && (
          <div className="space-y-4 max-w-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-[#9952FF]/10 text-[#9952FF] rounded-full flex items-center justify-center shadow-inner transition hover:scale-105 duration-200">
              <Upload size={30} />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-black text-slate-800">اختر صورة المنتج للبدء فوراً</span>
              <p className="text-xs text-slate-400 font-bold">يدعم التقاط الصور بالكاميرا أو إحضارها مباشرة من الاستوديو</p>
            </div>
            
            <button
              type="button"
              onClick={triggerFileInput}
              className="py-3 px-6 bg-[#9952FF] hover:bg-[#823ce6] text-white text-xs font-black rounded-xl transition shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Camera size={16} />
              <span>التقاط أو تصفح المعرض 📸</span>
            </button>
          </div>
        )}

        {/* STEP RESIZING: Local JS Optimizations */}
        {currentStep === 'resizing' && (
          <div className="space-y-3 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-[#9952FF] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-black text-[#9952FF] animate-pulse">جاري ضغط حجم الصورة وتقليص دقتها...</span>
            <p className="text-[11px] text-slate-400 font-bold max-w-xs leading-normal">
              نقوم بضغط الصورة أولاً محلياً لتجنب استهلاك باقة الإنترنت وحماية ذاكرة المتصفح من الانهيار.
            </p>
          </div>
        )}

        {/* STEP BG-REMOVING: Pure Client-Side ML Model Processing */}
        {currentStep === 'bg-removing' && (
          <div className="space-y-4 flex flex-col items-center w-full max-w-xs">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-[#9952FF] border-t-transparent rounded-full animate-spin"></div>
              <Sparkles className="absolute text-[#9952FF] animate-pulse" size={24} />
            </div>
            
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-violet-600 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black text-slate-800">جاري مسح ومعالجة خلفية المنتج... {progressPercentage}%</span>
              <p className="text-[10px] text-slate-400 font-bold leading-normal">
                جاري تفعيل نموذج الذكاء الاصطناعي محلياً على المتصفح لمعالجة الخطوط وتفريغ الأطراف.
              </p>
            </div>
          </div>
        )}

        {/* STEP UPLOADING: Firebase File Transmission */}
        {currentStep === 'uploading' && (
          <div className="space-y-3 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-black text-emerald-600 animate-pulse">جاري رفع الملف المعالج لـ Cloud Storage...</span>
            <p className="text-[11px] text-slate-400 font-semibold">توفير الصورة الناتجة في مخزن Firebase الآمن.</p>
          </div>
        )}

        {/* STEP COMPLETED: Interactive Comparison View */}
        {currentStep === 'completed' && processedImageUrl && (
          <div className="space-y-4 w-full flex flex-col items-center">
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-black block">الصورة الأصلية:</span>
                <div className="aspect-square rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                  <img 
                    src={originalFile ? URL.createObjectURL(originalFile) : ''} 
                    alt="Original Upload" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-emerald-500 font-black block">الصورة المعالجة (شفاف):</span>
                <div 
                  className="aspect-square rounded-xl overflow-hidden border border-emerald-200 flex items-center justify-center p-2"
                  style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 20%, transparent 20%), radial-gradient(#cbd5e1 20%, transparent 20%)',
                    backgroundPosition: '0 0, 4px 4px',
                    backgroundSize: '8px 8px',
                    backgroundColor: '#f8fafc'
                  }}
                >
                  <img 
                    src={processedImageUrl} 
                    alt="Transparent Product" 
                    className="w-full h-full object-contain" 
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl w-full max-w-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                  <Check size={14} />
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-800 block">تم رفع الصورة بنجاح وتفريغها</span>
                  <span className="text-[10px] text-emerald-500 font-bold">الرابط جاهز لحفظ مواصفات المنتج الجديد</span>
                </div>
              </div>
              
              <a 
                href={processedImageUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 hover:bg-emerald-100/50 rounded-xl transition text-emerald-600 hover:text-emerald-700"
                title="معاينة الصورة بكامل دقتها"
              >
                <Eye size={16} />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Upload Instructions Footer */}
      {currentStep !== 'completed' && (
        <div className="mt-4 flex items-center gap-2 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-slate-400">
          <ImageIcon size={16} className="shrink-0 text-slate-400" />
          <span className="text-[10px] leading-normal font-bold">
            💡 نصيحة: للتمكن من عزل ومسح الخلفية بنجاح ووضوح؛ يُفضل وضع المنتج على طاولة ذات لون مغاير للأطراف ومع إضاءة كافية ومناسبة.
          </span>
        </div>
      )}
    </div>
  );
};
