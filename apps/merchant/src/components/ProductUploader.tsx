// =======================================================
// Required Dependencies Installation Commands:
// npm install @imgly/background-removal firebase lucide-react
// =======================================================

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload, Camera, Sparkles, Check, AlertCircle, RefreshCw, Eye, Image as ImageIcon } from 'lucide-react';
import { removeBackgroundOptimized } from '@shared/utils/backgroundRemoval';
import { ensureStoreSessionForStorage } from '@shared/lib/storeAuth';

// Interfaces
interface ProductUploaderProps {
  onUploadSuccess: (downloadUrl: string) => void;
  onUploadError?: (error: Error) => void;
  /** Firestore store id — required for Storage rules path products/images/{storeId}/… */
  storeId: string;
}

/**
 * Robust Client-Side Resizing to protect browser memory (WASM)
 * from crashing due to high-resolution mobile photos.
 */
const resizeImageFileToBlob = (file: File, maxWidth = 800, maxHeight = 800): Promise<Blob> => {
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

        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob conversion failed.'));
          },
          'image/jpeg',
          0.92,
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
  storeId,
}) => {
  const { t } = useTranslation();
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
      const resizedBlob = await resizeImageFileToBlob(file, 800, 800);

      // Step 2: Client-side Native Background Removal (optimized pipeline)
      setCurrentStep('bg-removing');
      const outputBlob = await removeBackgroundOptimized(resizedBlob, (_key, percentage) => {
        setProgressPercentage(percentage);
      });

      // Show immediate local preview
      const localResultUrl = URL.createObjectURL(outputBlob);
      setProcessedImageUrl(localResultUrl);

      // Step 3: Secure Upload to Firebase Storage (merchant-scoped path)
      setCurrentStep('uploading');
      if (!storeId) {
        throw new Error('Store id is required for product image upload.');
      }
      await ensureStoreSessionForStorage(storeId);
      const storage = getStorage();
      const fileExtension = 'png';
      const uniqueFileName = `${Date.now()}_optimized.${fileExtension}`;
      const storageRef = ref(storage, `products/images/${storeId}/${uniqueFileName}`);

      await uploadBytes(storageRef, outputBlob, { contentType: 'image/png' });
      const downloadUrl = await getDownloadURL(storageRef);

      // Success Hooks
      setCurrentStep('completed');
      onUploadSuccess(downloadUrl);
    } catch (err: any) {
      const errorMessage = err?.message || t('merchant.products.upload.processFailed');
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
    <div className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow w-full max-w-xl mx-auto rounded-3xl p-6 shadow-xl font-sans text-white" dir="rtl">
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
          <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-vibrant-purple shadow-sm">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">{t('merchant.products.upload.title')}</h3>
            <p className="text-xs text-slate-400 font-bold">{t('merchant.products.upload.subtitle')}</p>
          </div>
        </div>
        {currentStep === 'completed' && (
          <button
            onClick={handleReset}
            className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-500 font-black px-3 py-1.5 rounded-xl border border-slate-200/50 transition flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>{t('merchant.products.upload.newImage')}</span>
          </button>
        )}
      </div>

      {/* Error Indicator Box */}
      {errorMsg && (
        <div className="mb-5 bg-rose-50 border border-rose-100/80 p-4 rounded-2xl text-rose-600 text-xs font-bold leading-relaxed flex gap-2.5 items-start">
          <AlertCircle size={18} className="shrink-0 text-rose-500 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-rose-800">{t('merchant.products.upload.errorTitle')}</span>
            <p className="font-medium text-[11px] leading-normal">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Main Flow Canvas Rendering */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 min-h-[300px] flex flex-col items-center justify-center p-6 text-center">
        
        {/* STEP IDLE: Initial State Trigger */}
        {currentStep === 'idle' && (
          <div className="space-y-4 max-w-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-vibrant-purple/10 text-vibrant-purple rounded-full flex items-center justify-center shadow-inner transition hover:scale-105 duration-200">
              <Upload size={30} />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-black text-slate-800">{t('merchant.products.upload.idleTitle')}</span>
              <p className="text-xs text-slate-400 font-bold">{t('merchant.products.upload.idleHint')}</p>
            </div>
            
            <button
              type="button"
              onClick={triggerFileInput}
              className="py-3 px-6 bg-vibrant-purple hover:bg-[#823ce6] text-white text-xs font-black rounded-xl transition shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Camera size={16} />
              <span>{t('merchant.products.upload.pickImage')}</span>
            </button>
          </div>
        )}

        {/* STEP RESIZING: Local JS Optimizations */}
        {currentStep === 'resizing' && (
          <div className="space-y-3 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-vibrant-purple border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-black text-vibrant-purple animate-pulse">{t('merchant.products.upload.resizing')}</span>
            <p className="text-[11px] text-slate-400 font-bold max-w-xs leading-normal">
              {t('merchant.products.upload.resizingHint')}
            </p>
          </div>
        )}

        {/* STEP BG-REMOVING: Pure Client-Side ML Model Processing */}
        {currentStep === 'bg-removing' && (
          <div className="space-y-4 flex flex-col items-center w-full max-w-xs">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-vibrant-purple border-t-transparent rounded-full animate-spin"></div>
              <Sparkles className="absolute text-vibrant-purple animate-pulse" size={24} />
            </div>
            
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-violet-600 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black text-slate-800">{t('merchant.products.upload.bgRemoving', { percent: progressPercentage })}</span>
              <p className="text-[10px] text-slate-400 font-bold leading-normal">
                {t('merchant.products.upload.bgRemovingHint')}
              </p>
            </div>
          </div>
        )}

        {/* STEP UPLOADING: Firebase File Transmission */}
        {currentStep === 'uploading' && (
          <div className="space-y-3 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-black text-emerald-600 animate-pulse">{t('merchant.products.upload.uploading')}</span>
            <p className="text-[11px] text-slate-400 font-semibold">{t('merchant.products.upload.uploadingHint')}</p>
          </div>
        )}

        {/* STEP COMPLETED: Interactive Comparison View */}
        {currentStep === 'completed' && processedImageUrl && (
          <div className="space-y-4 w-full flex flex-col items-center">
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-black block">{t('merchant.products.upload.originalLabel')}</span>
                <div className="aspect-square rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                  <img 
                    src={originalFile ? URL.createObjectURL(originalFile) : ''} 
                    alt="Original Upload" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-emerald-500 font-black block">{t('merchant.products.upload.processedLabel')}</span>
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
                  <span className="text-xs font-black text-emerald-800 block">{t('merchant.products.upload.successTitle')}</span>
                  <span className="text-[10px] text-emerald-500 font-bold">{t('merchant.products.upload.successHint')}</span>
                </div>
              </div>
              
              <a 
                href={processedImageUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 hover:bg-emerald-100/50 rounded-xl transition text-emerald-600 hover:text-emerald-700"
                title={t('merchant.products.upload.previewFull')}
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
            {t('merchant.products.upload.tip')}
          </span>
        </div>
      )}
    </div>
  );
};
