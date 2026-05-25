/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, updateDoc, increment, arrayRemove, arrayUnion } from 'firebase/firestore';
import { Reel, Product, Store, Customer } from '../types';
import { 
  Heart, 
  Bookmark, 
  Volume2, 
  VolumeX, 
  Play, 
  X, 
  ShoppingBag, 
  Loader2, 
  Film, 
  ArrowLeft,
  Share2
} from 'lucide-react';

interface ReelsProfileListProps {
  currentCustomer?: Customer | null;
  onAddToCart?: (product: Product, qty?: number) => void;
  onVisitStore?: (storeId: string) => void;
  onShareReel?: (reel: Reel) => void;
}

export const ReelsProfileList: React.FC<ReelsProfileListProps> = ({ 
  currentCustomer,
  onAddToCart,
  onVisitStore,
  onShareReel
}) => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs for Saved vs Liked
  const [activeTab, setActiveTab] = useState<'saved' | 'liked'>('saved');
  const [isExpanded, setIsExpanded] = useState(false);

  // Modal playback state
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [modalStore, setModalStore] = useState<Store | null>(null);
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [muted, setMuted] = useState(false); // Default sound on according to user request

  // Interaction updates synced with Firestore
  const [localSaved, setLocalSaved] = useState<Record<string, boolean>>({});
  const [localLiked, setLocalLiked] = useState<Record<string, boolean>>({});

  // Sync state initially
  useEffect(() => {
    if (currentCustomer) {
      const savedMap: Record<string, boolean> = {};
      const likedMap: Record<string, boolean> = {};
      (currentCustomer.savedReels || []).forEach(id => { savedMap[id] = true; });
      (currentCustomer.likedReels || []).forEach(id => { likedMap[id] = true; });
      setLocalSaved(savedMap);
      setLocalLiked(likedMap);
    } else {
      try {
        const storedLikes = JSON.parse(localStorage.getItem('unregistered_liked_reels') || '[]');
        const storedSaves = JSON.parse(localStorage.getItem('unregistered_saved_reels') || '[]');
        const savedMap: Record<string, boolean> = {};
        const likedMap: Record<string, boolean> = {};
        storedLikes.forEach((id: string) => { likedMap[id] = true; });
        storedSaves.forEach((id: string) => { savedMap[id] = true; });
        setLocalSaved(savedMap);
        setLocalLiked(likedMap);
      } catch (e) {
        console.warn(e);
      }
    }
  }, [currentCustomer]);

  // Fetch all reels on component load
  useEffect(() => {
    const fetchReels = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'reels'));
        const list: Reel[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Reel);
        });
        
        // Sort descending
        list.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setReels(list);
      } catch (err) {
        console.error("Error loading reels for profile list: ", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReels();
  }, []);

  // Fetch product & store details when a reel is viewed inside the modal
  useEffect(() => {
    const fetchModalDetails = async () => {
      if (!selectedReel) return;
      setLoadingModalData(true);
      setModalProduct(null);
      setModalStore(null);

      try {
        // Fetch Product
        if (selectedReel.linkedProductId) {
          const prodSnap = await getDoc(doc(db, 'products', selectedReel.linkedProductId));
          if (prodSnap.exists()) {
            setModalProduct({ id: prodSnap.id, ...prodSnap.data() } as Product);
          }
        }

        // Fetch Store
        if (selectedReel.merchantId) {
          const storeSnap = await getDoc(doc(db, 'stores', selectedReel.merchantId));
          if (storeSnap.exists()) {
            setModalStore({ id: storeSnap.id, ...storeSnap.data() } as Store);
          }
        }
      } catch (err) {
        console.error("Error fetching modal reel items: ", err);
      } finally {
        setLoadingModalData(false);
      }
    };

    fetchModalDetails();
  }, [selectedReel]);

  // Interaction handlers from modal/tile
  const handleLikeReel = async (reel: Reel, e: React.MouseEvent) => {
    e.stopPropagation();
    const isLiked = localLiked[reel.id];
    
    try {
      const reelDocRef = doc(db, 'reels', reel.id);
      await updateDoc(reelDocRef, { 
        likesCount: increment(isLiked ? -1 : 1) 
      });

      setLocalLiked(prev => ({ ...prev, [reel.id]: !isLiked }));
      setReels(prev => prev.map(r => r.id === reel.id ? { ...r, likesCount: Math.max(0, (r.likesCount || 0) + (isLiked ? -1 : 1)) } : r));
      setSelectedReel(prev => prev && prev.id === reel.id ? { ...prev, likesCount: Math.max(0, (prev.likesCount || 0) + (isLiked ? -1 : 1)) } : prev);
      
      if (currentCustomer) {
        const customerRef = doc(db, 'customers', currentCustomer.id);
        await updateDoc(customerRef, {
          likedReels: isLiked ? arrayRemove(reel.id) : arrayUnion(reel.id)
        });
        if (currentCustomer.likedReels) {
          if (isLiked) {
            currentCustomer.likedReels = currentCustomer.likedReels.filter(id => id !== reel.id);
          } else {
            currentCustomer.likedReels = [...currentCustomer.likedReels, reel.id];
          }
        } else {
          currentCustomer.likedReels = isLiked ? [] : [reel.id];
        }
      } else {
        const storedLikes = JSON.parse(localStorage.getItem('unregistered_liked_reels') || '[]');
        const newLikes = isLiked ? storedLikes.filter((id: string) => id !== reel.id) : [...storedLikes, reel.id];
        localStorage.setItem('unregistered_liked_reels', JSON.stringify(newLikes));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBookmark = async (reel: Reel, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSaved = localSaved[reel.id];

    try {
      const reelDocRef = doc(db, 'reels', reel.id);
      await updateDoc(reelDocRef, { 
        savesCount: increment(isSaved ? -1 : 1) 
      });

      setLocalSaved(prev => ({ ...prev, [reel.id]: !isSaved }));
      setReels(prev => prev.map(r => r.id === reel.id ? { ...r, savesCount: Math.max(0, (r.savesCount || 0) + (isSaved ? -1 : 1)) } : r));
      setSelectedReel(prev => prev && prev.id === reel.id ? { ...prev, savesCount: Math.max(0, (prev.savesCount || 0) + (isSaved ? -1 : 1)) } : prev);
      
      if (currentCustomer) {
        const customerRef = doc(db, 'customers', currentCustomer.id);
        await updateDoc(customerRef, {
          savedReels: isSaved ? arrayRemove(reel.id) : arrayUnion(reel.id)
        });
        if (currentCustomer.savedReels) {
          if (isSaved) {
            currentCustomer.savedReels = currentCustomer.savedReels.filter(id => id !== reel.id);
          } else {
            currentCustomer.savedReels = [...currentCustomer.savedReels, reel.id];
          }
        } else {
          currentCustomer.savedReels = isSaved ? [] : [reel.id];
        }
      } else {
        const storedSaves = JSON.parse(localStorage.getItem('unregistered_saved_reels') || '[]');
        const newSaves = isSaved ? storedSaves.filter((id: string) => id !== reel.id) : [...storedSaves, reel.id];
        localStorage.setItem('unregistered_saved_reels', JSON.stringify(newSaves));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter lists according to toggled state
  const displayedReels = reels.filter(r => {
    if (activeTab === 'saved') {
      return localSaved[r.id];
    } else {
      return localLiked[r.id];
    }
  });

  const handleTabClick = (tab: 'saved' | 'liked') => {
    if (activeTab === tab) {
      // Toggle expansion if clicking active one
      setIsExpanded(!isExpanded);
    } else {
      setActiveTab(tab);
      setIsExpanded(true);
    }
  };

  return (
    <div className="w-full bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4" dir="rtl">
      
      {/* Segmented control tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
        <button
          onClick={() => handleTabClick('saved')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'saved' && isExpanded
              ? 'bg-[#9952FF] text-white shadow-md' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Bookmark size={14} className={activeTab === 'saved' && isExpanded ? "fill-current" : ""} />
          <span>المحفوظات ({Object.keys(localSaved).filter(k => localSaved[k]).length})</span>
        </button>

        <button
          onClick={() => handleTabClick('liked')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'liked' && isExpanded
              ? 'bg-[#9952FF] text-white shadow-md' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Heart size={14} className={activeTab === 'liked' && isExpanded ? "fill-current" : ""} />
          <span>الاعجابات ({Object.keys(localLiked).filter(k => localLiked[k]).length})</span>
        </button>
      </div>

      {isExpanded && (
        <div className="animate-fade-in space-y-4 border-t border-slate-100 pt-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
              {activeTab === 'saved' ? 'جميع الريلز المحفوظة في حسابك' : 'قائمة المقاطع التي وضعت عليها إعجاباً'}
            </span>
            <button 
              onClick={() => setIsExpanded(false)}
              className="text-xs font-black text-[#9952FF] hover:underline"
            >
              إغلاق القائمة ×
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <Loader2 size={24} className="animate-spin text-[#9952FF] mb-2" />
              <span className="text-[11px] font-bold">جاري تحميل المفضلة...</span>
            </div>
          ) : displayedReels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-slate-50 rounded-2xl border border-slate-100 text-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <Film size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-700">القائمة فارغة حالياً</h4>
                <p className="text-[10px] text-slate-400 font-medium max-w-xs mt-1">
                  {activeTab === 'saved' 
                    ? 'استمتع بمقاطع الفيديو التسوقية وقم بحفظ المفضلة للرجوع إليها بسرعة هنا في أي وقت!' 
                    : 'اضغط على زر الإعجاب في ريلز المتاجر وسوف تظهر المقاطع المفضلة لديك هنا!'}
                </p>
              </div>
            </div>
          ) : (
            /* Video grid */
            <div className="grid grid-cols-3 gap-2.5">
              {displayedReels.map((reel) => (
                <div 
                  key={reel.id}
                  onClick={() => setSelectedReel(reel)}
                  className="relative aspect-[9/16] bg-slate-950 rounded-2xl overflow-hidden group cursor-pointer border border-slate-100 transition shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  {/* Dynamic video frame preloader */}
                  <video 
                    src={reel.videoUrl} 
                    muted 
                    preload="metadata"
                    className="w-full h-full object-cover rounded-2xl" 
                  />

                  {/* Action states info overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5 text-white">
                    <div className="flex items-center justify-between text-[9px] font-bold font-mono">
                      <span className="flex items-center gap-0.5"><Heart size={8} className="fill-red-500 text-red-500" /> {reel.likesCount || 0}</span>
                      <span className="flex items-center gap-0.5"><Play size={8} className="fill-current text-white" /> {reel.viewsCount || 0}</span>
                    </div>
                  </div>

                  {/* Tiny play badge helper */}
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white opacity-90">
                    <Play size={10} className="fill-current translate-x-[-0.5px]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* IMMERSIVE PLAYBACK OVERLAY MODAL */}
      {selectedReel && (
        <div className="fixed inset-0 bg-black/95 z-[120] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fade-in font-tajawal">
          {/* Main layout container with phone Aspect */}
          <div className="w-full max-w-sm aspect-[9/16] bg-black rounded-3xl relative overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
            
            {/* Real Playback video player */}
            <video
              src={selectedReel.videoUrl}
              autoPlay
              loop
              playsInline
              muted={muted}
              className="absolute inset-0 w-full h-full object-cover z-0"
              onClick={() => setMuted(!muted)}
            />

            {/* Top row actions (Close & Mute) */}
            <div className="absolute top-4 inset-x-4 flex justify-between items-center z-20">
              <button 
                onClick={() => setSelectedReel(null)}
                className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white transition hover:scale-105 active:scale-95"
              >
                <X size={18} />
              </button>

              <button 
                onClick={() => setMuted(!muted)}
                className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white transition hover:scale-105 active:scale-95"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>

            {/* Dark bottom backing gradient */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/25 to-transparent pointer-events-none z-10" />

            {/* Left aligned like/bookmark buttons inside the immersive player overlay */}
            <div className="absolute bottom-28 right-4 flex flex-col items-center gap-4 z-20">
              <button 
                onClick={(e) => handleLikeReel(selectedReel, e)}
                className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition ${
                  localLiked[selectedReel.id] 
                    ? 'bg-rose-500 text-white' 
                    : 'bg-black/50 border border-white/10 text-white hover:bg-black/60'
                }`}
              >
                <Heart size={20} className={localLiked[selectedReel.id] ? "fill-current animate-pulse" : ""} />
              </button>

              <button 
                onClick={(e) => handleToggleBookmark(selectedReel, e)}
                className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition ${
                  localSaved[selectedReel.id] 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-black/50 border border-white/10 text-white hover:bg-black/60'
                }`}
              >
                <Bookmark size={20} className={localSaved[selectedReel.id] ? "fill-current" : ""} />
              </button>

              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  if (onShareReel) {
                    onShareReel(selectedReel);
                  } else {
                    try {
                      await navigator.clipboard.writeText(selectedReel.videoUrl);
                      alert('تم نسخ رابط الفيديو لمشاركته! 🔗🎬');
                    } catch (err) {
                      console.warn(err);
                    }
                  }
                  try {
                    const reelDocRef = doc(db, 'reels', selectedReel.id);
                    await updateDoc(reelDocRef, { 
                      sharesCount: increment(1) 
                    });
                    setReels(prev => prev.map(r => r.id === selectedReel.id ? { ...r, sharesCount: (r.sharesCount || 0) + 1 } : r));
                    setSelectedReel(prev => prev && prev.id === selectedReel.id ? { ...prev, sharesCount: (prev.sharesCount || 0) + 1 } : prev);
                  } catch (err) {
                    console.warn(err);
                  }
                }}
                className="w-11 h-11 rounded-full backdrop-blur-md bg-black/50 border border-white/10 text-white hover:bg-black/60 flex items-center justify-center transition hover:scale-105 active:scale-95"
              >
                <Share2 size={20} />
              </button>
            </div>

            {/* Live linked Product details bottom card */}
            <div className="absolute bottom-6 left-4 right-20 z-20">
              {loadingModalData ? (
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-white flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin text-amber-500" />
                  <span className="text-xs font-bold">جاري تحميل بطاقة الشراء...</span>
                </div>
              ) : modalProduct ? (
                <div className="bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 text-white gap-2.5 flex flex-col">
                  {/* Shop & Product Name */}
                  <div>
                    {modalStore && (
                      <span 
                        onClick={() => {
                          setSelectedReel(null);
                          if (onVisitStore) onVisitStore(modalStore.id);
                        }}
                        className="text-[10px] text-[#A78BFA] font-black cursor-pointer bg-[#A78BFA]/10 px-2 py-0.5 rounded-md hover:bg-[#A78BFA]/20 inline-block mb-1.5"
                      >
                        {modalStore.shopName}
                      </span>
                    )}
                    <h5 className="text-xs font-bold leading-snug line-clamp-1">{modalProduct.name}</h5>
                    <p className="text-sm font-black text-[#A78BFA] mt-1.5">
                      {(modalProduct.finalPrice || modalProduct.price).toLocaleString()} د.ع
                    </p>
                  </div>

                  {/* Dynamic checkout/add to cart inside profile preview */}
                  <button
                    onClick={() => {
                      if (onAddToCart) {
                        onAddToCart(modalProduct, 1);
                        alert(`تمت إضافة ${modalProduct.name} إلى السلة بنجاح 🛍️`);
                      }
                    }}
                    className="w-full py-2.5 bg-[#9952FF] hover:bg-[#853df2] transition text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-[#9952FF]/20"
                  >
                    <ShoppingBag size={14} />
                    <span>إضافة إلى السلة</span>
                  </button>
                </div>
              ) : (
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-3 text-white text-center text-[10px] border border-white/10">
                  لا يوجد منتج مرتبط بهذا الريل حالياً.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
