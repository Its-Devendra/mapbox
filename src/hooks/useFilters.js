'use client';

import { useState, useMemo, useCallback } from 'react';

/**
 * useFilters Hook - Multi-filter state management
 * 
 * Usage:
 * const { filters, setFilter, filtered, reset } = useFilters(items, {
 *   status: { type: 'exact', field: 'isActive' },
 *   category: { type: 'exact', field: 'categoryId' }
 * });
 */
export default function useFilters(items = [], filterConfig = {}) {
  // Initialize filter state from config
  const initialFilters = useMemo(() => {
    const initial = {};
    Object.keys(filterConfig).forEach(key => {
      initial[key] = filterConfig[key].defaultValue ?? 'all';
    });
    return initial;
  }, []);

  const [filters, setFilters] = useState(initialFilters);

  // Set a single filter value
  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Reset all filters to default
  const reset = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // Reset a single filter
  const resetFilter = useCallback((key) => {
    setFilters(prev => ({
      ...prev,
      [key]: initialFilters[key],
    }));
  }, [initialFilters]);

  // Apply filters to items
  const filtered = useMemo(() => {
    return items.filter(item => {
      return Object.entries(filterConfig).every(([key, config]) => {
        const filterValue = filters[key];
        
        // Skip if filter is 'all' or not set
        if (filterValue === 'all' || filterValue === undefined || filterValue === null) {
          return true;
        }

        const itemValue = getNestedValue(item, config.field);

        switch (config.type) {
          case 'exact':
            return itemValue === filterValue;
          
          case 'boolean':
            if (filterValue === 'active') return itemValue === true;
            if (filterValue === 'inactive') return itemValue === false;
            return true;
          
          case 'includes':
            if (Array.isArray(itemValue)) {
              return itemValue.includes(filterValue);
            }
            return false;
          
          case 'range':
            const { min, max } = filterValue;
            if (min !== undefined && itemValue < min) return false;
            if (max !== undefined && itemValue > max) return false;
            return true;
          
          case 'custom':
            return config.filter(item, filterValue);
          
          default:
            return true;
        }
      });
    });
  }, [items, filters, filterConfig]);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      return value !== 'all' && value !== initialFilters[key];
    });
  }, [filters, initialFilters]);

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      return value !== 'all' && value !== initialFilters[key];
    }).length;
  }, [filters, initialFilters]);

  return {
    filters,
    setFilter,
    filtered,
    reset,
    resetFilter,
    hasActiveFilters,
    activeFilterCount,
  };
}

/**
 * Helper to get nested object values
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
