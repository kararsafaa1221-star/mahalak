import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/useApp';
import { db, storage } from '../lib/firebase';
import { collection, doc, setDoc, updateDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Film, Upload, Film as VideoIcon, CheckCircle, AlertTriangle, AlertCircle, ShoppingBag, X, Loader2 } from 'lucide-react';
import { Product, Reel } from '../types';

interface UploadReelProps {
  onSuccess?: () => void;
  reelToEdit?: Reel | null;
  onCancel?: () => void;
}

export const UploadReel: React.FC<UploadReelProps> = ({ onSuccess, reelToEdit, onCancel }) => {
  const { currentMerchant } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProds, setLoadingProds] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (reelToEdit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedProductId(reelToEdit.linkedProductId);
      if (reelToEdit.videoUrl) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVideoPreview(reelToEdit.videoUrl);
      }
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedProductId('');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVideoPreview(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVideoFile(null);
    }
  }, [reelToEdit]);

  const merchantId = currentMerchant?.id || '';

  // 1. Fetch products for this merchant from Firestore directly as instructed
  useEffect(() => {
    if (!merchantId) return;

    const fetchMerchantProducts = async () => {
      setLoadingProds(true);
      setError(null);
      try {
        const prodsRef = collection(db, 'products');
        const q = query(prodsRef, where('storeId', '==', merchantId));
        const querySnapshot = await getDocs(q);
        
        const fetchedProds: Product[] = [];
        querySnapshot.forEach((doc) => {
          fetchedProds.push({ id: doc.id, ...doc.data() } as Product);
        });
        
        setProducts(fetchedProds);
      } catch (err: any) {
        console.error("Error fetching merchant products from Firestore:", err);
        setError("فشل تحميل قائمة المنتجات من Firestore. يرجى التحقق من الشبكة.");
      } finally {
        setLoadingProds(false);
      }
    };

    fetchMerchantProducts();
  }, [merchantId]);

  // Clean preview URL on unmount
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  // Handle video selection, check limits (size and duration)
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);

    // 1. Check file size (limit to 250MB for general convenience)
    const maxSize = 250 * 1024 * 1024; // 250MB
    if (file.size > maxSize) {
      setError("حجم الفيديو كبير جداً! الحد الأقصى المسموح به هو 250 ميجابايت.");
      return;
    }

    // Initialize temporary preview to read duration
    const objectUrl = URL.createObjectURL(file);
    const videoElement = document.createElement('video');
    videoElement.src = objectUrl;

    videoElement.onloadedmetadata = () => {
      URL.revokeObjectURL(videoElement.src);
      
      // 2. Check duration (Limit to 60 seconds)
      if (videoElement.duration > 60.5) {
        setError("مدة المقطع طويلة جداً! يرجى تحميل مقطع لا يزيد عن 60 ثانية (ريلز قصير).");
        setVideoFile(null);
        setVideoPreview(null);
        return;
      }

      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    };

    videoElement.onerror = () => {
      URL.revokeObjectURL(videoElement.src);
      setError("صيغة الفيديو غير مدعومة أو الملف تالف!");
    };
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    setUploadProgress(null);
    setError(null);
  };

  // Upload video and save document to Firestore
  const handleUploadAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile && !reelToEdit) {
      setError("يرجى اختيار مقطع فيديو أولاً.");
      return;
    }
    if (!selectedProductId) {
      setError("يرجى اختيار المنتج المرتبط بهذا المقطع.");
      return;
    }
    if (!merchantId) {
      setError("فشل التعرف على المتجر الحالي! يرجى تسجيل الدخول.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      if (videoFile) {
        setUploadProgress(0);
        // 1. Upload vertical video to Firebase Storage (with standard unique ID)
        const reelId = reelToEdit ? reelToEdit.id : ('reel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
        const storagePath = `reels/${merchantId}/${reelId}_${videoFile.name}`;
        const storageRef = ref(storage, storagePath);

        const uploadTask = uploadBytesResumable(storageRef, videoFile, {
          contentType: videoFile.type
        });

        // Track progress
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(Math.round(progress));
            },
            (err) => {
              console.error("Storage upload error:", err);
              reject(new Error("حدث خطأ أثناء رفع الفيديو إلى التخزين السحابي."));
            },
            async () => {
              try {
                // Get download URL
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

                // 2. Save/Update the Reel document to Firestore
                const reelDocRef = doc(db, 'reels', reelId);
                const reelData = {
                  id: reelId,
                  videoUrl: downloadUrl,
                  linkedProductId: selectedProductId,
                  merchantId: merchantId,
                  createdAt: reelToEdit ? (reelToEdit.createdAt || serverTimestamp()) : serverTimestamp(),
                  likesCount: reelToEdit ? (reelToEdit.likesCount || 0) : 0,
                  viewsCount: reelToEdit ? (reelToEdit.viewsCount || 0) : 0
                };

                await setDoc(reelDocRef, reelData);
                resolve();
              } catch (saveErr: any) {
                console.error("Firestore save error:", saveErr);
                reject(new Error("فشل حفظ بيانات المقطع في قاعدة البيانات."));
              }
            }
          );
        });
      } else if (reelToEdit) {
        // Just update product link
        const reelDocRef = doc(db, 'reels', reelToEdit.id);
        await updateDoc(reelDocRef, {
          linkedProductId: selectedProductId
        });
      }

      setSuccess(true);
      removeVideo();
      setSelectedProductId('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || "حدث خطأ غير متوقع أثناء الرفع.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-5 sm:p-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-[#9952FF]/10 flex items-center justify-center text-[#9952FF]">
          <Film size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900 font-tajawal">
            {reelToEdit ? "تعديل مقطع فيديو تسوقي (ريل)" : "إضافة مقطع فيديو تسوقي (ريل)"}
          </h2>
          <p className="text-xs text-slate-500 font-medium">ارفع مقاطع قصيرة رائعة واربطها بمنتجات متجرك لزيادة المبيعات والطلب المباشر!</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800 text-xs sm:text-sm font-bold flex items-start gap-2.5">
          <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#00AA4F] text-xs sm:text-sm font-bold flex items-start gap-2.5">
          <CheckCircle size={18} className="text-[#00AA4F] shrink-0 mt-0.5" />
          <span>تم رفع مقطع الريل التسوقي وحفظه بنجاح! ✅ ستظهر للزبائن في قائمة الفيديوهات للتسوق الفوري.</span>
        </div>
      )}

      <form onSubmit={handleUploadAndSave} className="space-y-5">
        
        {/* Dropdown: Product Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-800 font-tajawal">
            اختر المنتج المرتبط بالفيديو <span className="text-rose-500">*</span>
          </label>
          {loadingProds ? (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 text-xs font-bold">
              <Loader2 size={16} className="animate-spin text-[#9952FF]" />
              <span>جاري تحميل قائمة منتجات متجرك...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 text-xs font-bold flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-amber-600 shrink-0" />
              <div>
                <p>لا توجد منتجات منشورة في متجرك حالياً!</p>
                <p className="text-[10px] text-amber-700 font-medium mt-1">يجب إضافة منتجات أولاً لتتمكن من ربطها بمقاطع الفيديو التسوقية.</p>
              </div>
            </div>
          ) : (
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={uploading}
              className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs sm:text-sm font-bold focus:ring-4 focus:ring-[#9952FF]/5 focus:border-[#9952FF] outline-none transition-all placeholder:text-slate-400"
              required
            >
              <option value="">-- اختر أحد المنتجات للتسوق --</option>
              {products.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.name} ({prod.finalPrice} د.ع)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Video Upload area */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-800 font-tajawal">
            مقطع الفيديو العمودي <span className="text-rose-500">*</span>
          </label>
          
          {!videoPreview ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-[#9952FF] transition-all bg-slate-50/50 hover:bg-slate-50 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer group"
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleVideoSelect}
                accept="video/*"
                className="hidden"
                disabled={uploading}
              />
              <div className="w-14 h-14 rounded-full bg-[#9952FF]/5 group-hover:bg-[#9952FF]/10 text-[#9952FF] flex items-center justify-center mb-4 transition-all group-hover:scale-110">
                <Upload size={26} />
              </div>
              <p className="text-xs sm:text-sm font-black text-slate-800 font-tajawal">انقر لتحميل مقطع الريل لربطه بالمنتج</p>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-2 max-w-[280px]">
                يفضل فيديو عمودي بنسبة أبعاد (9:16)، الحد الأقصى للحجم <strong className="text-slate-500">250MB</strong> والمدة لا تزيد عن <strong className="text-slate-500">60 ثانية</strong>.
              </p>
            </div>
          ) : (
            <div className="relative rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col md:flex-row items-center gap-4 p-4">
              <div className="w-full md:w-48 aspect-[9/16] bg-black rounded-2xl overflow-hidden relative">
                <video 
                  src={videoPreview} 
                  controls 
                  preload="metadata" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1 space-y-3 p-2 self-start md:self-center">
                <div className="flex items-center gap-2 text-indigo-400">
                  <VideoIcon size={18} />
                  <span className="text-xs font-bold text-white">مقطع جاهز للرفع</span>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {videoFile ? (
                    <>
                      <p className="truncate max-w-[200px] text-white font-bold">{videoFile.name}</p>
                      <p className="mt-1">الحجم: {(videoFile.size / (1024 * 1024)).toFixed(2)} ميجابايت (MB)</p>
                    </>
                  ) : (
                    <p className="text-white font-bold">مقطع الفيديو الحالي المخزن في السحابة</p>
                  )}
                </div>
                
                {!uploading && (
                  <button 
                    type="button"
                    onClick={removeVideo}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition active:scale-95 flex items-center gap-1.5"
                  >
                    <X size={14} />
                    <span>إلغاء المقطع الحالي</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {uploading && uploadProgress !== null && (
          <div className="space-y-2 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
            <div className="flex justify-between items-center text-xs font-black text-[#9952FF]">
              <span>جاري رفع الفيديو إلى السحابة...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#9952FF] to-violet-600 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={uploading}
              className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition active:scale-95 text-center"
            >
              إلغاء التعديل
            </button>
          )}
          <button
            type="submit"
            disabled={uploading || (!videoFile && !reelToEdit) || !selectedProductId || products.length === 0}
            className={`py-4 text-white font-black text-sm rounded-2xl shadow-xl transition active:scale-95 flex items-center justify-center gap-2 ${onCancel ? 'flex-1' : 'w-full'} ${
              uploading || (!videoFile && !reelToEdit) || !selectedProductId || products.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-[#9952FF] hover:bg-[#853df2] shadow-[#9952FF]/10'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin text-white" />
                <span>جاري المعالجة والرفع...</span>
              </>
            ) : (
              <>
                <Film size={18} />
                <span>{reelToEdit ? "حفظ التعديلات ريل 🚀" : "نشر الريل للمشترين الآن 🚀"}</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
