'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api';
import { Astrologer } from '../../../../lib/types';
import { useAuth } from '../../../../context/AuthContext';
import { useRealTime } from '../../../../context/RealTimeContext';
import astrologerService from '../../../../lib/astrologerService';
import { 
  Star, 
  MessageCircle, 
  Phone, 
  Video, 
  Languages, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Share2,
  ShieldCheck,
  User,
  Calendar,
  Heart,
  Clock,
  Copy
} from 'lucide-react';

// Types for Reviews
interface Review {
  _id: string;
  reviewId?: string;
  userName: string;
  userProfileImage?: string;
  rating: number;
  reviewText?: string;
  serviceType?: string;
  reviewDate: string;
  isTestData?: boolean;
}

export default function AstrologerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  // Contexts
  const { user, isAuthenticated } = useAuth();
  const { initiateChat, initiateCall, isChatProcessing, isCallProcessing } = useRealTime();

  // Data State
  const [astrologer, setAstrologer] = useState<Astrologer | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Follow State
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Bio State
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isBioLong, setIsBioLong] = useState(false);

  // Review State
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (id) {
      loadAstrologer();
    }
  }, [id]);

  // Check follow status when user is authenticated and astrologer loads
  useEffect(() => {
    if (isAuthenticated && id) {
      checkFollowStatus();
    }
  }, [isAuthenticated, id]);

  const loadAstrologer = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/astrologers/${id}`);
      if (response.data.success) {
        const data = response.data.data;
        setAstrologer(data);
        
        // Initial Reviews
        if (response.data.reviews) {
          setReviewsList(response.data.reviews);
        }

        // Bio length check
        const bio = data.description || data.about || "";
        if (bio.length > 150) setIsBioLong(true);
      }
    } catch (error) {
      console.error('Failed to load astrologer:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await astrologerService.getFavorites();
      if (response.success) {
        const isFav = response.data.some((fav: any) => {
            const favId = typeof fav === 'string' ? fav : (fav._id || fav.astrologerId);
            return favId === id;
        });
        setIsFollowing(isFav);
      }
    } catch (error) {
      console.error('Failed to check follow status:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
        router.push('/login');
        return;
    }

    try {
        setFollowLoading(true);
        if (isFollowing) {
            await astrologerService.removeFavorite(id);
            setIsFollowing(false);
        } else {
            await astrologerService.addFavorite(id);
            setIsFollowing(true);
        }
    } catch (error) {
        console.error('Follow toggle failed:', error);
    } finally {
        setFollowLoading(false);
    }
  };

  // --- SHARE FUNCTIONALITY ---
  const handleShare = async () => {
    if (!astrologer) return;

    const shareData = {
      title: `${astrologer.name} - Astrologer Profile`,
      text: `Consult with ${astrologer.name} (${astrologer.specializations.join(', ')}) on our platform!`,
      url: window.location.href,
    };

    // Use Web Share API if available (Mobile)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to Clipboard Copy (Desktop)
      try {
        await navigator.clipboard.writeText(window.location.href);
        // Simple alert or you can replace with a toast notification
        alert('Link copied to clipboard!'); 
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const loadMoreReviews = async () => {
    if (loadingReviews || !hasMoreReviews) return;
    
    try {
      setLoadingReviews(true);
      const nextPage = reviewPage + 1;
      const response = await apiClient.get(`/astrologers/${id}/reviews`, {
        params: { page: nextPage, limit: 10 }
      });

      if (response.data.success) {
        const newReviews = response.data.data.reviews || [];
        if (newReviews.length > 0) {
          setReviewsList(prev => [...prev, ...newReviews]);
          setReviewPage(nextPage);
          setHasMoreReviews(response.data.data.pagination?.hasNextPage || false);
        } else {
          setHasMoreReviews(false);
        }
      }
    } catch (error) {
      console.error('Failed to load more reviews', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  // --- Real-time & Availability Logic ---
  const waitTime = useMemo(() => {
    if (!astrologer?.availability) return 0;
    const { isOnline, isAvailable, busyUntil } = astrologer.availability;

    if (!isOnline || isAvailable) return 0;
    if (!busyUntil) return 5;

    const now = new Date();
    const busyDate = new Date(busyUntil);
    const diffMinutes = Math.ceil((busyDate.getTime() - now.getTime()) / 60000);
    
    return Math.max(1, diffMinutes);
  }, [astrologer]);

  const isBusy = astrologer?.availability.isOnline && (!astrologer?.availability.isAvailable || waitTime > 0);

  const handleConnect = async (mode: 'chat' | 'call') => {
    if (!isAuthenticated) {
        if (confirm(`Please login to start a ${mode} consultation`)) {
          router.push('/login');
        }
        return;
    }

    if (!astrologer || !astrologer.availability.isOnline) {
        alert('Astrologer is currently offline');
        return;
    }

    if (mode === 'chat') {
        await initiateChat(astrologer);
    } else {
        await initiateCall(astrologer, 'audio');
    }
  };

  // --- Helper Functions ---
  const formatCount = (count: number) => {
    return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count;
  };

  const renderRatingBar = (star: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div key={star} className="flex items-center text-xs mb-1.5">
        <span className="w-3 font-semibold text-gray-600">{star}</span>
        <Star className="w-3 h-3 text-yellow-400 fill-current mx-1" />
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden mx-2">
          <div 
            className={`h-full rounded-full ${star === 5 ? 'bg-green-500' : 'bg-yellow-400'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="w-8 text-right text-gray-500">{count}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!astrologer) {
    return <div className="text-center py-12 text-gray-700">Astrologer not found.</div>;
  }

  const bioText = astrologer.bio || "Expert astrologer with deep knowledge.";
  const displayedBio = isBioExpanded ? bioText : bioText.slice(0, 150) + (isBioLong ? "..." : "");

  const ratingBreakdown = astrologer.ratings?.breakdown || {};
  const totalRatingCount = astrologer.ratings?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* --- Main Profile Card --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Header / Top Section */}
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              
              {/* Profile Image */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <img
                    src={astrologer.profilePicture || 'https://i.pravatar.cc/150'}
                    alt={astrologer.name}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-yellow-50"
                  />
                  <div className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-4 border-white ${
                    astrologer.availability?.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
                
                <div className="mt-3 flex items-center bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="ml-1 font-bold text-gray-900">{astrologer.ratings.average.toFixed(1)}</span>
                  <span className="mx-1 text-gray-400">|</span>
                  <span className="text-xs text-gray-600 font-medium">{formatCount(astrologer.stats.totalOrders)} orders</span>
                </div>
              </div>

              {/* Info Column */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                  <div>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                        {astrologer.name}
                      </h1>
                      <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-50" />
                    </div>
                    <p className="mt-2 text-gray-700 font-medium text-lg">
                      {astrologer.specializations.join(', ')}
                    </p>
                    
                    <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                      <div className="flex items-center text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                        <Languages className="w-4 h-4 mr-2" />
                        {astrologer.languages.join(', ')}
                      </div>
                      <div className="flex items-center text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        {astrologer.experienceYears} Years Exp
                      </div>
                    </div>
                  </div>

                  {/* Actions: Share & Follow */}
                  <div className="flex items-center justify-center gap-3 mt-4 md:mt-0">
                    <button 
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        className={`flex items-center gap-1 px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
                            isFollowing 
                                ? 'bg-pink-50 border-pink-200 text-pink-600' 
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                        {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                    </button>
                    
                    {/* Share Button with Handler */}
                    <button 
                      onClick={handleShare}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                      title="Share Profile"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full" />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 bg-gray-50/50">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center text-gray-500 mb-1">
                <MessageCircle className="w-4 h-4 mr-1" />
                <span className="text-xs font-semibold uppercase tracking-wide">Chat Mins</span>
              </div>
              <p className="font-bold text-gray-900">
                {formatCount(astrologer.stats?.totalMinutes || 0)}
              </p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center text-gray-500 mb-1">
                <Phone className="w-4 h-4 mr-1" />
                <span className="text-xs font-semibold uppercase tracking-wide">Call Mins</span>
              </div>
              <p className="font-bold text-gray-900">
                {formatCount(astrologer.stats?.totalOrders || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* --- About Section --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">About {astrologer.name}</h2>
          <div className="relative">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
              {displayedBio}
            </p>
            {isBioLong && (
              <button 
                onClick={() => setIsBioExpanded(!isBioExpanded)}
                className="mt-2 text-yellow-600 font-semibold flex items-center hover:text-yellow-700 text-sm"
              >
                {isBioExpanded ? 'View Less' : 'View More'}
                {isBioExpanded ? <ChevronUp className="w-4 h-4 ml-1"/> : <ChevronDown className="w-4 h-4 ml-1"/>}
              </button>
            )}
          </div>
        </div>

        {/* --- Ratings & Reviews Section --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Ratings & Reviews</h2>

          {/* Review Summary */}
          {totalRatingCount > 0 && (
              <div className="flex flex-col md:flex-row gap-8 mb-8">
                <div className="flex flex-col items-center justify-center min-w-[120px]">
                  <span className="text-5xl font-bold text-gray-900">
                    {astrologer.ratings.average.toFixed(1)}
                  </span>
                  <div className="flex text-yellow-400 my-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star 
                        key={i} 
                        className="w-4 h-4 fill-current" 
                        color={i <= Math.round(astrologer.ratings.average) ? "#FACC15" : "#E5E7EB"}
                        fill={i <= Math.round(astrologer.ratings.average) ? "#FACC15" : "none"}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">{formatCount(totalRatingCount)} reviews</span>
                </div>
                
                <div className="flex-1 max-w-sm">
                  {[5, 4, 3, 2, 1].map((star) => 
                    renderRatingBar(star, ratingBreakdown[star as keyof typeof ratingBreakdown] || 0, totalRatingCount)
                  )}
                </div>
              </div>
          )}

          <div className="border-t border-gray-100 my-4" />

          {/* Review List */}
          {reviewsList.length > 0 ? (
            <div className="space-y-6">
              {reviewsList.map((review, index) => (
                <div key={review.reviewId || index} className="border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {review.userProfileImage ? (
                        <img 
                          src={review.userProfileImage} 
                          alt={review.userName} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{review.userName || 'Anonymous'}</p>
                          {review.isTestData && (
                             <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded font-medium">Test</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                           {[1, 2, 3, 4, 5].map((i) => (
                             <Star 
                               key={i} 
                               className={`w-3 h-3 ${i <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} 
                             />
                           ))}
                           {review.serviceType && (
                             <span className="text-xs text-gray-400 ml-2">• {review.serviceType}</span>
                           )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-400">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(review.reviewDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  
                  {review.reviewText && (
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed pl-[52px]">
                      {review.reviewText}
                    </p>
                  )}
                </div>
              ))}
              
              {/* Load More Button */}
              {hasMoreReviews && (
                <div className="pt-4 text-center">
                  <button 
                    onClick={loadMoreReviews}
                    disabled={loadingReviews}
                    className="text-sm font-semibold text-yellow-600 hover:text-yellow-700 disabled:opacity-50"
                  >
                    {loadingReviews ? 'Loading...' : 'Show More Reviews'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Empty State for Zero Reviews
            <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                 <MessageCircle className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No Reviews Yet</h3>
              <p className="text-gray-500 text-center text-sm max-w-xs mb-4">
                Be the first to consult with {astrologer.name} and share your experience with the community.
              </p>
              <button 
                onClick={() => handleConnect('chat')}
                className="text-sm font-semibold text-yellow-600 hover:text-yellow-700 hover:underline"
              >
                Start a consultation now
              </button>
            </div>
          )}
        </div>

        {/* --- Action Buttons Footer (Sticky) --- */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:static md:bg-transparent md:border-0 md:shadow-none md:p-0 z-20">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4">
            
            {/* Chat Button */}
            <button
              onClick={() => handleConnect('chat')}
              disabled={!astrologer.availability.isOnline || isChatProcessing || isBusy}
              className={`flex flex-col items-center justify-center py-3 px-4 rounded-xl border transition-all ${
                astrologer.availability.isOnline && !isBusy
                  ? 'border-green-500 bg-green-50 hover:bg-green-100 active:bg-green-200' 
                  : 'border-gray-200 bg-gray-50 opacity-80 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2">
                 {isChatProcessing ? (
                     <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                 ) : (
                    <MessageCircle className={`w-5 h-5 ${astrologer.availability.isOnline && !isBusy ? 'text-green-600' : 'text-gray-400'}`} />
                 )}
                
                <span className={`font-bold ${astrologer.availability.isOnline && !isBusy ? 'text-green-700' : 'text-gray-500'}`}>
                    {isChatProcessing ? 'Starting...' : isBusy ? `Busy (~${waitTime}m)` : 'Chat'}
                </span>
              </div>
              <span className={`text-xs mt-1 ${astrologer.availability.isOnline && !isBusy ? 'text-green-600' : 'text-gray-400'}`}>
                ₹{astrologer.pricing.chat}/min
              </span>
            </button>

            {/* Call Button */}
            <button
              onClick={() => handleConnect('call')}
              disabled={!astrologer.availability.isOnline || isCallProcessing || isBusy}
              className={`flex flex-col items-center justify-center py-3 px-4 rounded-xl border transition-all ${
                astrologer.availability.isOnline && !isBusy
                  ? 'border-blue-500 bg-blue-50 hover:bg-blue-100 active:bg-blue-200' 
                  : 'border-gray-200 bg-gray-50 opacity-80 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2">
                {isCallProcessing ? (
                     <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                 ) : (
                    <Phone className={`w-5 h-5 ${astrologer.availability.isOnline && !isBusy ? 'text-blue-600' : 'text-gray-400'}`} />
                 )}
                <span className={`font-bold ${astrologer.availability.isOnline && !isBusy ? 'text-blue-700' : 'text-gray-500'}`}>
                    {isCallProcessing ? 'Calling...' : isBusy ? `Busy (~${waitTime}m)` : 'Call'}
                </span>
              </div>
              <span className={`text-xs mt-1 ${astrologer.availability.isOnline && !isBusy ? 'text-blue-600' : 'text-gray-400'}`}>
                ₹{astrologer.pricing.call}/min
              </span>
            </button>
            
            {/* Wait Time Info (Desktop only usually) */}
            {isBusy && (
               <div className="hidden md:flex flex-col items-center justify-center py-3 px-4 rounded-xl border border-orange-200 bg-orange-50">
                  <div className="flex items-center gap-2 text-orange-600">
                    <Clock className="w-5 h-5" />
                    <span className="font-bold">Wait Time</span>
                  </div>
                  <span className="text-xs mt-1 text-orange-600">
                    Approx {waitTime} mins
                  </span>
               </div>
            )}

          </div>
        </div>

        {/* Spacer for mobile sticky footer */}
        <div className="h-24 md:hidden"></div>
      </div>
    </div>
  );
}