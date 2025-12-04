'use client';

import { useState } from 'react';

export default function FilterSidebar({ categories, onFilterChange }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`bg-white shadow-lg transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'}`}>
      <div className="p-4 border-b">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between text-gray-700 hover:text-gray-900"
        >
          <span className={`font-medium ${!isOpen && 'hidden'}`}>Filters</span>
          <span className="text-sm">⚙️</span>
        </button>
      </div>

      {isOpen && (
        <div className="p-4 space-y-3">
          <button
            onClick={() => onFilterChange('All')}
            className="w-full text-left px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium"
          >
            All Categories
          </button>

          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onFilterChange(category)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
            >
              {category}
            </button>
          ))}

          {categories.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-4">
              No categories available
            </div>
          )}
        </div>
      )}
    </div>
  );
}


