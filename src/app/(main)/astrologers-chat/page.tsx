'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AstrologerCard from '../../../components/astrologers/AstrologerCard';
import astrologerService from '../../../lib/astrologerService';
import { Astrologer } from '../../../lib/types';

const TABS = [
  { id: 'All', label: 'All' },
  { id: 'tarot', label: 'Tarot' },
  { id: 'palmistry', label: 'Palmistry' },
  { id: 'vedic', label: 'Vedic' },
  { id: 'numerology', label: 'Numerology' },
  { id: 'vastu', label: 'Vastu' },
];

const SORT_OPTIONS = [
  { id: 'popularity', label: 'Popularity' },
  { id: 'exp-high-low', label: 'Experience : High to Low' },
  { id: 'exp-low-high', label: 'Experience : Low to High' },
  { id: 'orders-high-low', label: 'Total orders : High to Low' },
  { id: 'orders-low-high', label: 'Total orders : Low to High' },
  { id: 'price-high-low', label: 'Price : High to Low' },
  { id: 'price-low-high', label: 'Price : Low to High' },
  { id: 'rating-high-low', label: 'Rating : High to Low' },
];

export default function ChatAstrologersPage() {
  const router = useRouter();
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('popularity');
  const [showSortModal, setShowSortModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSortBy, setTempSortBy] = useState<string>('popularity');

  const loadAstrologers = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: 20,
        sortBy,
      };

      if (activeTab !== 'All') {
        params.skills = [activeTab];
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const result = await astrologerService.searchAstrologers(params);

      if (result.success) {
        const formatted: Astrologer[] = (result.data || []).map((astro: any) => {
          let badge: Astrologer['tier'] = 'none';
          const rating = astro.ratings?.average || 0;
          const orders = astro.stats?.totalOrders || 0;

          if (rating >= 4.8 && orders > 1000) badge = 'celebrity';
          else if (rating >= 4.5 && orders > 500) badge = 'top-choice';
          else if (rating >= 4.3 && orders > 100) badge = 'rising-star';

          const isOnline = astro.availability?.isOnline || false;
          const isAvailable = astro.availability?.isAvailable || false;

          return {
            ...astro,
            tier: badge,
            availability: {
              isOnline,
              isAvailable,
              busyUntil: astro.availability?.busyUntil,
            },
          } as Astrologer;
        });

        setAstrologers(formatted);
      } else {
        setAstrologers([]);
      }
    } catch (err) {
      console.error('❌ Load astrologers error:', err);
      setAstrologers([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, sortBy, searchQuery]);

  useEffect(() => {
    loadAstrologers();
  }, [loadAstrologers]);

  useEffect(() => {
    if (showSortModal) {
      setTempSortBy(sortBy);
    }
  }, [showSortModal, sortBy]);

  const handleApplyFilter = () => {
    setSortBy(tempSortBy);
    setShowSortModal(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAstrologers();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-wide">
              Chat with Astrologers
            </h1>
            <div className="mt-2 h-[3px] w-32 bg-yellow-400 rounded-full" />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center bg-yellow-400 rounded-full px-5 py-2.5 shadow-sm">
            <span className="mr-2 text-lg text-gray-900">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name..."
              className="bg-transparent outline-none text-sm placeholder-gray-700 text-gray-900 w-52"
            />
          </form>

          {/* Filter button */}
          <button
            type="button"
            className="flex items-center border border-gray-300 rounded-full px-5 py-2.5 text-sm text-gray-800 bg-white hover:bg-gray-50 shadow-sm"
            onClick={() => setShowSortModal(true)}
          >
            <span className="mr-2 text-gray-600">⚙</span>
            Filter
          </button>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
        <form onSubmit={handleSearch} className="flex items-center bg-yellow-400 rounded-full px-4 py-2 shadow-sm">
          <span className="mr-2 text-lg text-gray-900">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search astrologer name..."
            className="bg-transparent outline-none text-sm placeholder-gray-700 text-gray-900 flex-1"
          />
        </form>
      </div>

      {/* Category tabs */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-10 py-3">
        <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-5 py-2 rounded-full border text-sm whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-yellow-100 border-yellow-400 text-yellow-700 font-semibold shadow-sm'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.id === 'All' && (
                <span className="mr-2 text-yellow-500 text-base">▦</span>
              )}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Astrologers List */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="h-8 w-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="ml-3 text-sm text-gray-600">Loading astrologers...</p>
          </div>
        ) : astrologers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-600 text-lg font-medium">No astrologers found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{astrologers.length}</span> astrologers
            </div>
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {astrologers.map((astro) => (
                <AstrologerCard key={astro._id} astrologer={astro} mode="chat" />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Filter Modal */}
      {showSortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 tracking-wide uppercase">FILTERS</h2>
              <button onClick={() => setShowSortModal(false)} className="text-2xl text-gray-400 hover:text-gray-600 transition-colors">✕</button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/3 bg-gray-50 border-r border-gray-100 pt-2">
                <button className="w-full text-left relative bg-white py-4 px-5">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-700"></div>
                  <span className="text-sm font-medium text-gray-900">Sorting</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 bg-white">
                <div className="space-y-4">
                  {SORT_OPTIONS.map((opt) => (
                    <label key={opt.id} className="flex items-center cursor-pointer group">
                      <input type="radio" name="sortParams" value={opt.id} checked={tempSortBy === opt.id} onChange={() => setTempSortBy(opt.id)} className="hidden" />
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center mr-3 transition-all ${tempSortBy === opt.id ? 'bg-teal-700 border-teal-700' : 'border-teal-600 bg-white'}`}>
                        {tempSortBy === opt.id && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className={`text-[15px] ${tempSortBy === opt.id ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button type="button" onClick={() => setTempSortBy('popularity')} className="text-teal-700 text-sm font-medium hover:underline">Reset</button>
              <button type="button" onClick={handleApplyFilter} className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2.5 px-10 rounded-lg text-sm transition-colors shadow-sm">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
