'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children, projectId = null }) {
  const [theme, setTheme] = useState({
    primary: '#1e3a8a',
    secondary: '#ffffff',
    tertiary: '#64748b',
    quaternary: '#f1f5f9',
    mapboxStyle: 'mapbox://styles/mapbox/dark-v11'
  });
  const [loading, setLoading] = useState(true);

  // Fetch active theme from API (project-specific or global)
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const url = projectId
          ? `/api/themes/active?projectId=${projectId}`
          : '/api/themes/active';

        const response = await fetch(url);
        if (response.ok) {
          const themeData = await response.json();
          setTheme(themeData);
        }
      } catch (error) {
        console.error('Error fetching theme:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTheme();
  }, [projectId]);

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}