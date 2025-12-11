'use client';

import { useState } from 'react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFilters: any;
  onFilterToggle: (section: string, itemId: string) => void;
  onApply: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  selectedFilters,
  onFilterToggle,
  onApply,
}) => {
  const [selectedSection, setSelectedSection] = useState('Sort by');

  const filterSections = {
    'Sort by': [
      { id: 'popularity', label: 'Popularity' },
      { id: 'exp-high-low', label: 'Experience: High to Low' },
      { id: 'exp-low-high', label: 'Experience: Low to High' },
      { id: 'price-high-low', label: 'Price: High to Low' },
      { id: 'price-low-high', label: 'Price: Low to High' },
      { id: 'rating-high-low', label: 'Rating: High to Low' },
    ],
    Skill: [
      { id: 'vedic', label: 'Vedic Astrology' },
      { id: 'numerology', label: 'Numerology' },
      { id: 'tarot', label: 'Tarot Reading' },
      { id: 'palmistry', label: 'Palmistry' },
      { id: 'vastu', label: 'Vastu Shastra' },
      { id: 'face-reading', label: 'Face Reading' },
      { id: 'kp', label: 'KP Astrology' },
      { id: 'nadi', label: 'Nadi Astrology' },
      { id: 'horoscope', label: 'Horoscope Reading' },
      { id: 'kundli', label: 'Kundli Making' },
      { id: 'prashna', label: 'Prashna Kundali' },
      { id: 'psychic', label: 'Psychic Reading' },
    ],
    Language: [
      { id: 'english', label: 'English' },
      { id: 'hindi', label: 'Hindi' },
      { id: 'bengali', label: 'Bengali' },
      { id: 'marathi', label: 'Marathi' },
      { id: 'tamil', label: 'Tamil' },
    ],
    Gender: [
      { id: 'male', label: 'Male' },
      { id: 'female', label: 'Female' },
    ],
    Country: [
      { id: 'india', label: 'India' },
      { id: 'outside-india', label: 'Outside India' },
    ],
    'Top Astrologers': [
      { id: 'celebrity', label: 'Celebrity' },
      { id: 'top-choice', label: 'Top Choice' },
      { id: 'rising-star', label: 'Rising Star' },
      { id: 'all', label: 'All' },
    ],
  };

  const getStateKey = (section: string) => {
    switch (section) {
      case 'Skill':
        return 'skills';
      case 'Language':
        return 'languages';
      case 'Gender':
        return 'genders';
      case 'Country':
        return 'countries';
      case 'Top Astrologers':
        return 'topAstrologers';
      default:
        return section.toLowerCase();
    }
  };

  const isFilterSelected = (section: string, itemId: string) => {
    if (section === 'Sort by') return selectedFilters.sortBy === itemId;
    const key = getStateKey(section);
    return (selectedFilters[key] || []).includes(itemId);
  };

  const renderFilterContent = () => {
    const items = filterSections[selectedSection as keyof typeof filterSections] || [];
    const key = getStateKey(selectedSection);

    return (
      <div className="flex-1 overflow-y-auto">
        {selectedSection !== 'Sort by' && (
          <div className="flex items-center px-4 py-3 bg-gray-50 border-b">
            <button
              onClick={() => {
                const allIds = items.map((i) => i.id);
                onFilterToggle(selectedSection, allIds[0]); // Toggle all logic needs adjustment
              }}
              className="text-blue-600 text-sm font-medium"
            >
              Select all
            </button>
            <span className="text-gray-400 mx-2">-</span>
            <button
              onClick={() => {
                // Clear logic for this section
              }}
              className="text-blue-600 text-sm font-medium"
            >
              Clear
            </button>
          </div>
        )}

        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onFilterToggle(selectedSection, item.id)}
            className="w-full flex items-center px-4 py-3 border-b hover:bg-gray-50"
          >
            <div
              className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                isFilterSelected(selectedSection, item.id)
                  ? 'bg-yellow-400 border-yellow-400'
                  : 'border-gray-300'
              }`}
            >
              {isFilterSelected(selectedSection, item.id) && (
                <span className="text-white text-sm">✓</span>
              )}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">{item.label}</div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full max-h-[85%] rounded-t-2xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">Sort & Filter</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-32 bg-gray-50 border-r overflow-y-auto">
            {Object.keys(filterSections).map((section) => (
              <button
                key={section}
                onClick={() => setSelectedSection(section)}
                className={`w-full text-left px-3 py-3 text-sm border-b ${
                  selectedSection === section
                    ? 'bg-yellow-100 border-l-4 border-l-yellow-400 font-semibold'
                    : 'text-gray-600'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{section}</span>
                  {section === 'Sort by' ? (
                    selectedFilters.sortBy !== 'popularity' && (
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    )
                  ) : (
                    (selectedFilters[getStateKey(section)]?.length > 0) && (
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    )
                  )}
                </div>
              </button>
            ))}
          </div>

          {renderFilterContent()}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={() => {
              onApply();
              onClose();
            }}
            className="w-full bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:bg-yellow-500"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
