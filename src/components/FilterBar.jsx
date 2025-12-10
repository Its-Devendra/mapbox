

export default function FilterSidebar({ categories = [], onFilterChange, activeFilter, theme, className = "fixed bottom-6 left-1/2 transform -translate-x-1/2" }) {
  // Use provided theme or fallback to default
  const filterTheme = theme || {
    primary: '#1e3a8a',
    secondary: '#ffffff',
    tertiary: '#64748b',
    quaternary: '#f1f5f9'
  };

  // Helper to check if content is SVG
  const isSvgContent = (content) => {
    if (!content || typeof content !== 'string') return false;
    const trimmed = content.trim().toLowerCase();
    return trimmed.startsWith('<svg') || trimmed.includes('<svg');
  };

  // Helper to get icon content
  const renderIcon = (category) => {
    // Handle "All" case
    if (category === 'All') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
        </svg>
      );
    }

    // Handle category object
    if (typeof category === 'object') {
      // Check if icon is SVG content
      if (isSvgContent(category.icon)) {
        return <div dangerouslySetInnerHTML={{ __html: category.icon }} className="w-5 h-5 [&>svg]:w-full [&>svg]:h-full" />;
      }

      // If icon exists and is not SVG, treat as emoji
      if (category.icon && category.icon.length > 0) {
        return <span className="text-base leading-none">{category.icon}</span>;
      }

      // Fallback to default tag icon
      return (
        <div className="w-5 h-5 text-current">
          <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
            <path d="M7 7h.01" />
          </svg>
        </div>
      );
    }

    // Fallback for string categories (legacy support)
    return (
      <div className="w-5 h-5 text-current">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
          <path d="M7 7h.01" />
        </svg>
      </div>
    );
  };

  const getCategoryName = (category) => {
    if (category === 'All') return 'All';
    return typeof category === 'object' ? category.name : category;
  };

  // Prepare list including "All"
  const displayCategories = ['All', ...categories];

  return (
    <div className={`${className} z-50`}>
      <div
        className="backdrop-blur-md rounded-full px-4 py-3 shadow-2xl"
        style={{
          backgroundColor: `${filterTheme.primary}90`,
          borderColor: `${filterTheme.tertiary}50`,
          borderWidth: '1px',
          borderStyle: 'solid'
        }}
      >
        <div className="flex items-center space-x-2 overflow-x-auto max-w-[90vw] no-scrollbar">
          {displayCategories.map((category, index) => {
            const name = getCategoryName(category);
            const isActive = activeFilter === name;

            return (
              <button
                key={typeof category === 'object' ? (category.id || category.name) : name}
                onClick={() => onFilterChange(name)}
                className="flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: isActive ? filterTheme.secondary : 'transparent',
                  color: isActive ? filterTheme.primary : filterTheme.secondary,
                  boxShadow: isActive ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.target.style.backgroundColor = `${filterTheme.secondary}10`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {renderIcon(category)}
                <span className="text-sm font-medium">{name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}