'use client';

import { useState, useMemo, useCallback } from 'react';
import { debounce } from '@/utils/mapUtils';

/**
 * useSearch Hook - Debounced search with multi-field filtering
 * 
 * Usage:
 * const { query, setQuery, filtered } = useSearch(items, ['title', 'name']);
 */
export default function useSearch(items = [], searchFields = ['title', 'name'], debounceMs = 300) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounced setter
  const debouncedSetQuery = useMemo(
    () => debounce((value) => setDebouncedQuery(value), debounceMs),
    [debounceMs]
  );

  // Handle query change with debounce
  const handleQueryChange = useCallback((value) => {
    setQuery(value);
    debouncedSetQuery(value);
  }, [debouncedSetQuery]);

  // Filter items based on search query
  const filtered = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return items;
    }

    const searchLower = debouncedQuery.toLowerCase().trim();

    return items.filter(item => {
      return searchFields.some(field => {
        const value = getNestedValue(item, field);
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchLower);
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchLower);
        }
        return false;
      });
    });
  }, [items, debouncedQuery, searchFields]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    query,
    setQuery: handleQueryChange,
    filtered,
    clearSearch,
    isSearching: query.trim().length > 0,
    resultCount: filtered.length,
    totalCount: items.length,
  };
}

/**
 * Helper to get nested object values
 * e.g., getNestedValue(obj, 'category.name')
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
