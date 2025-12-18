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
  
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const { initiateChat, initiateCall, isChatProcessing, isCallProcessing } = useRealTime();

  const [astrologer, setAstrologer] = useState<Astrologer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isBioLong, setIsBioLong] = useState(false);
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (id) {
      loadAstrologer();
    }
  }, [id]);

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
        
        if (response.data.reviews) {
          setReviewsList(response.data.reviews);
        }

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
        openLoginModal();
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

  const handleShare = async () => {
    if (!astrologer) return;

    const shareData = {
      title: `${astrologer.name} - Astrologer Profile`,
      text: `Consult with ${astrologer.name} (${astrologer.specializations.join(', ')}) on our platform!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
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
          openLoginModal();
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

  const formatCount = (count: number) => {
    return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count;
  };

  const renderRatingBar = (star: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div key={star} className="flex items-center text-xs mb-1">
        <span className="w-3 font-semibold text-gray-600">{star}</span>
        <Star className="w-3 h-3 text-yellow-400 fill-current mx-1" />
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden mx-2">
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
    <div className="min-h-screen bg-gray-50 py-4 px-3 sm:px-4 lg:py-6">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* OPTIMIZED: Main Profile Card - Reduced padding, compact layout */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* OPTIMIZED: Header - More compact spacing */}
          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
              
              {/* OPTIMIZED: Profile Image - Smaller size */}
              <div className="flex flex-col items-center sm:items-start shrink-0">
                <div className="relative">
                  <img
                    src={astrologer.profilePicture || 'https://i.pravatar.cc/150'}
                    alt={astrologer.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-3 border-yellow-50 shadow-sm"
                  />
                  <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-3 border-white shadow-sm ${
                    astrologer.availability?.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
              </div>

              {/* OPTIMIZED: Info Column - Better use of horizontal space */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* OPTIMIZED: Title section - More compact */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                            {astrologer.name}
                          </h1>
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 fill-blue-50 shrink-0" />
                        </div>
                        <p className="text-sm sm:text-base text-gray-700 font-medium mb-2 truncate">
                          {astrologer.specializations.join(', ')}
                        </p>
                      </div>
                      
                      {/* OPTIMIZED: Actions moved inline for desktop */}
                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <button 
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                                isFollowing 
                                    ? 'bg-pink-50 border-pink-200 text-pink-600' 
                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <Heart className={`w-3.5 h-3.5 ${isFollowing ? 'fill-current' : ''}`} />
                            {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                        </button>
                        
                        <button 
                          onClick={handleShare}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                          title="Share Profile"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* OPTIMIZED: Compact info badges */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <div className="flex items-center text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-current mr-1" />
                        <span className="font-bold text-gray-900">{astrologer.ratings.average.toFixed(1)}</span>
                        <span className="mx-1 text-gray-300">•</span>
                        <span className="text-gray-600">{formatCount(astrologer.stats.totalOrders)}</span>
                      </div>
                      <div className="flex items-center text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                        <Languages className="w-3.5 h-3.5 mr-1" />
                        {astrologer.languages.join(', ')}
                      </div>
                      <div className="flex items-center text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                        {astrologer.experienceYears}Y Exp
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile actions */}
                <div className="flex sm:hidden items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button 
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className={`flex items-center gap-1 px-4 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                          isFollowing 
                              ? 'bg-pink-50 border-pink-200 text-pink-600' 
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                      <Heart className={`w-3.5 h-3.5 ${isFollowing ? 'fill-current' : ''}`} />
                      {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                  </button>
                  
                  <button 
                    onClick={handleShare}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors border border-gray-200"
                    title="Share Profile"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* OPTIMIZED: Stats Grid - More compact */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 bg-gray-50/50 border-t border-gray-100">
            <div className="px-3 py-2.5 text-center">
              <div className="flex items-center justify-center text-gray-500 mb-0.5">
                <MessageCircle className="w-3.5 h-3.5 mr-1" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Chat Mins</span>
              </div>
              <p className="font-bold text-gray-900 text-sm">
                {formatCount(astrologer.stats?.totalMinutes || 0)}
              </p>
            </div>
            <div className="px-3 py-2.5 text-center">
              <div className="flex items-center justify-center text-gray-500 mb-0.5">
                <Phone className="w-3.5 h-3.5 mr-1" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Call Mins</span>
              </div>
              <p className="font-bold text-gray-900 text-sm">
                {formatCount(astrologer.stats?.totalOrders || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* OPTIMIZED: About Section - More compact */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center">
            About
            <span className="ml-2 w-12 h-px bg-gradient-to-r from-yellow-400 to-transparent"></span>
          </h2>
          <div className="relative">
            <p className="text-gray-700 leading-relaxed text-sm">
              {displayedBio}
            </p>
            {isBioLong && (
              <button 
                onClick={() => setIsBioExpanded(!isBioExpanded)}
                className="mt-2 text-yellow-600 font-semibold flex items-center hover:text-yellow-700 text-xs"
              >
                {isBioExpanded ? 'Show Less' : 'Show More'}
                {isBioExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-0.5"/> : <ChevronDown className="w-3.5 h-3.5 ml-0.5"/>}
              </button>
            )}
          </div>
        </div>

        {/* OPTIMIZED: Ratings & Reviews Section - Compact layout */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center">
            Reviews
            <span className="ml-2 w-12 h-px bg-gradient-to-r from-yellow-400 to-transparent"></span>
          </h2>

          {/* OPTIMIZED: Review Summary - Side by side on mobile too */}
          {totalRatingCount > 0 && (
              <div className="flex gap-4 sm:gap-6 mb-4 pb-4 border-b border-gray-100">
                <div className="flex flex-col items-center justify-center min-w-[80px] sm:min-w-[100px]">
                  <span className="text-3xl sm:text-4xl font-bold text-gray-900">
                    {astrologer.ratings.average.toFixed(1)}
                  </span>
                  <div className="flex text-yellow-400 my-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star 
                        key={i} 
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" 
                        color={i <= Math.round(astrologer.ratings.average) ? "#FACC15" : "#E5E7EB"}
                        fill={i <= Math.round(astrologer.ratings.average) ? "#FACC15" : "none"}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{formatCount(totalRatingCount)} reviews</span>
                </div>
                
                <div className="flex-1 max-w-xs py-1">
                  {[5, 4, 3, 2, 1].map((star) => 
                    renderRatingBar(star, ratingBreakdown[star as keyof typeof ratingBreakdown] || 0, totalRatingCount)
                  )}
                </div>
              </div>
          )}

          {/* OPTIMIZED: Review List - More compact */}
          {reviewsList.length > 0 ? (
            <div className="space-y-4">
              {reviewsList.map((review, index) => (
                <div key={review.reviewId || index} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      {review.userProfileImage ? (
                        <img 
                          src={review.userProfileImage} 
                          alt={review.userName} 
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{review.userName || 'Anonymous'}</p>
                          {review.isTestData && (
                             <span className="bg-yellow-100 text-yellow-800 text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0">Test</span>
                          )}
                          {review.serviceType && (
                             <span className="text-[11px] text-gray-400 truncate">• {review.serviceType}</span>
                           )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                           {[1, 2, 3, 4, 5].map((i) => (
                             <Star 
                               key={i} 
                               className={`w-2.5 h-2.5 ${i <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} 
                             />
                           ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-[11px] text-gray-400 shrink-0">
                      <Calendar className="w-3 h-3 mr-0.5" />
                      {new Date(review.reviewDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  
                  {review.reviewText && (
                    <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed pl-10">
                      {review.reviewText}
                    </p>
                  )}
                </div>
              ))}
              
              {hasMoreReviews && (
                <div className="pt-2 text-center">
                  <button 
                    onClick={loadMoreReviews}
                    disabled={loadingReviews}
                    className="text-xs font-semibold text-yellow-600 hover:text-yellow-700 disabled:opacity-50 px-4 py-2 hover:bg-yellow-50 rounded-lg transition-colors"
                  >
                    {loadingReviews ? 'Loading...' : 'Show More Reviews'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-gray-100 rounded-lg bg-gray-50/30">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                 <MessageCircle className="w-6 h-6 text-gray-300" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No Reviews Yet</h3>
              <p className="text-gray-500 text-center text-xs max-w-xs mb-3">
                Be the first to consult and share your experience
              </p>
              <button 
                onClick={() => handleConnect('chat')}
                className="text-xs font-semibold text-yellow-600 hover:text-yellow-700 hover:underline"
              >
                Start consultation →
              </button>
            </div>
          )}
        </div>

        {/* OPTIMIZED: Action Buttons Footer - More compact */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 shadow-[0_-2px_8px_-2px_rgba(0,0,0,0.1)] md:static md:bg-transparent md:border-0 md:shadow-none md:p-0 z-20">
          <div className="max-w-4xl mx-auto grid grid-cols-2 gap-3">
            
            {/* Chat Button */}
            <button
              onClick={() => handleConnect('chat')}
              disabled={!astrologer.availability.isOnline || isChatProcessing || isBusy}
              className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-lg border-2 transition-all ${
                astrologer.availability.isOnline && !isBusy
                  ? 'border-green-500 bg-green-50 hover:bg-green-100 active:bg-green-200' 
                  : 'border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5">
                 {isChatProcessing ? (
                     <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                 ) : (
                    <MessageCircle className={`w-4 h-4 ${astrologer.availability.isOnline && !isBusy ? 'text-green-600' : 'text-gray-400'}`} />
                 )}
                
                <span className={`font-bold text-sm ${astrologer.availability.isOnline && !isBusy ? 'text-green-700' : 'text-gray-500'}`}>
                    {isChatProcessing ? 'Starting...' : isBusy ? `Busy ${waitTime}m` : 'Chat'}
                </span>
              </div>
              <span className={`text-[11px] mt-0.5 ${astrologer.availability.isOnline && !isBusy ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                ₹{astrologer.pricing.chat}/min
              </span>
            </button>

            {/* Call Button */}
            <button
              onClick={() => handleConnect('call')}
              disabled={!astrologer.availability.isOnline || isCallProcessing || isBusy}
              className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-lg border-2 transition-all ${
                astrologer.availability.isOnline && !isBusy
                  ? 'border-blue-500 bg-blue-50 hover:bg-blue-100 active:bg-blue-200' 
                  : 'border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isCallProcessing ? (
                     <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                 ) : (
                    <Phone className={`w-4 h-4 ${astrologer.availability.isOnline && !isBusy ? 'text-blue-600' : 'text-gray-400'}`} />
                 )}
                <span className={`font-bold text-sm ${astrologer.availability.isOnline && !isBusy ? 'text-blue-700' : 'text-gray-500'}`}>
                    {isCallProcessing ? 'Calling...' : isBusy ? `Busy ${waitTime}m` : 'Call'}
                </span>
              </div>
              <span className={`text-[11px] mt-0.5 ${astrologer.availability.isOnline && !isBusy ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                ₹{astrologer.pricing.call}/min
              </span>
            </button>
          </div>
          
          {/* Wait time indicator below buttons */}
          {isBusy && (
             <div className="mt-2 flex items-center justify-center gap-1.5 text-orange-600 bg-orange-50 py-1.5 px-3 rounded-lg border border-orange-100">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Approx wait: {waitTime} min</span>
             </div>
          )}
        </div>

        {/* Spacer for mobile sticky footer */}
        <div className="h-20 md:hidden"></div>
      </div>
    </div>
  );
}
