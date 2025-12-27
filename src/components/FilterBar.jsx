'use client';

import { useState, useRef, useEffect } from 'react';

export default function FilterBar({
  categories = [],
  onFilterChange,
  activeFilter = [],
  theme,
  className = "fixed bottom-3 left-2 right-2 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 sm:bottom-4"
}) {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Use provided theme or fallback to default
  const filterTheme = theme || {
    primary: '#1e3a8a',
    secondary: '#ffffff',
    tertiary: '#64748b',
    quaternary: '#f1f5f9'
  };

  // Normalize activeFilter to always be an array
  const activeFilters = Array.isArray(activeFilter) ? activeFilter : [activeFilter];
  // 'All' is active when filter is empty array (default state showing everything)
  // 'HideAll' is when user explicitly clicked All to deselect it
  const isAllActive = activeFilters.length === 0;
  const isHideAll = activeFilters.includes('HideAll');

  // Check scroll position for arrows
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [categories]);

  // Helper to check if content is SVG
  const isSvgContent = (content) => {
    if (!content || typeof content !== 'string') return false;
    const trimmed = content.trim().toLowerCase();
    return trimmed.startsWith('<svg') || trimmed.includes('<svg');
  };

  // Helper to get icon content
  const renderIcon = (category) => {
    const iconClass = "w-[18px] h-[18px] flex-shrink-0";

    if (category === 'All') {
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      );
    }

    if (typeof category === 'object') {
      if (isSvgContent(category.icon)) {
        return (
          <div
            dangerouslySetInnerHTML={{ __html: category.icon }}
            className="flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px] flex-shrink-0"
          />
        );
      }

      if (category.icon && category.icon.length > 0) {
        return <span className="text-sm leading-none flex-shrink-0">{category.icon}</span>;
      }

      return (
        <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
          <circle cx="7" cy="7" r="1" />
        </svg>
      );
    }

    return (
      <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
        <circle cx="7" cy="7" r="1" />
      </svg>
    );
  };

  const getCategoryName = (category) => {
    if (category === 'All') return 'All';
    if (!category) return '';
    return typeof category === 'object' ? category.name : category;
  };

  const handleFilterClick = (name) => {
    if (name === 'All') {
      // Toggle between showing all and hiding all
      if (isAllActive) {
        // Currently showing all, switch to hide all
        onFilterChange(['HideAll']);
      } else {
        // Currently hiding or filtering, switch to show all
        onFilterChange([]);
      }
    } else {
      // Category filter logic
      if (activeFilters.includes(name)) {
        // Deselecting a category
        const newFilters = activeFilters.filter(f => f !== name && f !== 'HideAll');
        onFilterChange(newFilters.length === 0 ? [] : newFilters);
      } else {
        // Selecting a category (remove HideAll if present)
        const newFilters = activeFilters.filter(f => f !== 'HideAll');
        onFilterChange([...newFilters, name]);
      }
    }
  };

  const scrollTo = (direction) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 200;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const displayCategories = ['All', ...categories];

  const uniqueCategories = displayCategories.reduce((acc, category) => {
    const name = getCategoryName(category);
    if (!acc.find(item => getCategoryName(item) === name)) {
      acc.push(category);
    }
    return acc;
  }, []);

  const isSecondaryWhite = filterTheme.secondary.toLowerCase() === '#ffffff' || filterTheme.secondary.toLowerCase() === '#fff';
  const activeTextColor = filterTheme.secondary;
  const inactiveTextColor = isSecondaryWhite ? '#1a1a1a' : filterTheme.secondary;

  // Helper to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    if (!hex) return `rgba(255, 255, 255, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Use tertiary color for glass base, defaulting to white if not provided
  const glassBaseColor = filterTheme.tertiary || '#ffffff';

  return (
    <div className={`${className} z-50`}>
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
        .ios-glass-effect {
          -webkit-backdrop-filter: blur(50px) saturate(200%);
          backdrop-filter: blur(50px) saturate(200%);
        }
        .ios-glass-btn-effect {
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          backdrop-filter: blur(30px) saturate(180%);
        }
      `}</style>

      <div className="relative flex items-center">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scrollTo('left')}
            className="ios-glass-btn-effect absolute -left-3 z-20 w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
            style={{
              background: hexToRgba(glassBaseColor, 0.35),
              border: `0.5px solid ${hexToRgba(glassBaseColor, 0.4)}`,
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
              color: '#1a1a1a',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Main Container - Uses theme glass controls */}
        <div
          className="relative overflow-hidden rounded-lg p-1 border shadow-lg"
          style={{
            backgroundColor: filterTheme.filterGlassEnabled !== false
              ? `${filterTheme.filterTertiary || filterTheme.tertiary || '#ffffff'}${Math.round((filterTheme.filterGlassOpacity ?? 25) * 2.55).toString(16).padStart(2, '0')}`
              : `${filterTheme.filterTertiary || filterTheme.tertiary || '#ffffff'}${Math.round((filterTheme.filterTertiaryOpacity ?? 100) * 2.55).toString(16).padStart(2, '0')}`,
            borderColor: `${filterTheme.filterTertiary || filterTheme.tertiary || '#ffffff'}${Math.round((filterTheme.filterBorderOpacity ?? 35) * 2.55).toString(16).padStart(2, '0')}`,
            ...(filterTheme.filterGlassEnabled !== false && {
              backdropFilter: `blur(${filterTheme.filterGlassBlur ?? 50}px) saturate(${filterTheme.filterGlassSaturation ?? 200}%)`,
              WebkitBackdropFilter: `blur(${filterTheme.filterGlassBlur ?? 50}px) saturate(${filterTheme.filterGlassSaturation ?? 200}%)`,
            }),
          }}
        >
          {/* Scrollable container - no extra padding, toggle doesn't have it */}
          <div
            ref={scrollContainerRef}
            className="relative flex items-center overflow-x-auto max-w-[calc(100vw-32px)] sm:max-w-[85vw]"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {uniqueCategories.map((category) => {
              const name = getCategoryName(category);
              const isActive = name === 'All' ? isAllActive : activeFilters.includes(name);

              return (
                <button
                  key={typeof category === 'object' ? (category.id || category.name) : name}
                  onClick={() => handleFilterClick(name)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer whitespace-nowrap flex-shrink-0"
                  style={{
                    backgroundColor: isActive
                      ? (filterTheme.filterPrimary || filterTheme.primary)
                      : 'transparent',
                    color: isActive
                      ? (filterTheme.filterSecondary || filterTheme.secondary)
                      : 'rgba(255,255,255,0.7)',
                    boxShadow: isActive
                      ? '0 2px 10px rgba(0, 0, 0, 0.15)'
                      : 'none',
                  }}
                >
                  {renderIcon(category)}
                  <span className="leading-tight">{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scrollTo('right')}
            className="ios-glass-btn-effect absolute -right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
            style={{
              background: hexToRgba(glassBaseColor, 0.35),
              border: `0.5px solid ${hexToRgba(glassBaseColor, 0.4)}`,
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
              color: '#1a1a1a',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
