'use client';

import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

/**
 * useCRUD Hook - Generic CRUD operations handler
 * 
 * Eliminates duplicate CRUD logic across admin components
 * Handles loading states, error handling, and optimistic updates
 */
export default function useCRUD({
  endpoint,
  projectId = null,
  initialData = [],
  onSuccess,
  onError,
}) {
  const [items, setItems] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Build URL with projectId filter if needed
  const buildUrl = useCallback((path = '') => {
    const base = `${endpoint}${path}`;
    // Add projectId as query parameter if provided (for GET requests)
    if (projectId && !path) {
      return `${base}?projectId=${projectId}`;
    }
    return base;
  }, [endpoint, projectId]);

  // Fetch all items
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(buildUrl());
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      let responseData = await response.json();
      
      // Handle paginated response format { projects: [...], total, page, ... }
      // or legacy array format [...]
      let data = Array.isArray(responseData) 
        ? responseData 
        : (responseData.projects || responseData.items || responseData.landmarks || responseData.places || []);
      
      setItems(data);
      return data;
    } catch (err) {
      setError(err.message);
      onError?.(err);
      toast.error('Error loading data');
      return [];
    } finally {
      setLoading(false);
    }
  }, [buildUrl, projectId, onError]);

  // Create new item
  const create = useCallback(async (data) => {
    try {
      setSubmitting(true);
      setError(null);

      const payload = projectId ? { ...data, projectId } : data;

      const response = await fetch(buildUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create');
      }

      const newItem = await response.json();
      
      // Optimistic update
      setItems(prev => [...prev, newItem]);
      
      toast.success('Created successfully!');
      onSuccess?.('create', newItem);
      
      return newItem;
    } catch (err) {
      setError(err.message);
      onError?.(err);
      toast.error(err.message || 'Error creating item');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [buildUrl, projectId, onSuccess, onError]);

  // Update existing item
  const update = useCallback(async (id, data) => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(buildUrl(`/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update');
      }

      const updatedItem = await response.json();
      
      // Optimistic update
      setItems(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ));
      
      toast.success('Updated successfully!');
      onSuccess?.('update', updatedItem);
      
      return updatedItem;
    } catch (err) {
      setError(err.message);
      onError?.(err);
      toast.error(err.message || 'Error updating item');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [buildUrl, onSuccess, onError]);

  // Delete item
  const remove = useCallback(async (id, skipConfirm = false) => {
    if (!skipConfirm && !confirm('Are you sure you want to delete this item?')) {
      return false;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(buildUrl(`/${id}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      // Optimistic update
      setItems(prev => prev.filter(item => item.id !== id));
      
      toast.success('Deleted successfully!');
      onSuccess?.('delete', id);
      
      return true;
    } catch (err) {
      setError(err.message);
      onError?.(err);
      toast.error(err.message || 'Error deleting item');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [buildUrl, onSuccess, onError]);

  // Refetch data
  const refetch = useCallback(() => {
    return fetchAll();
  }, [fetchAll]);

  return {
    items,
    setItems,
    loading,
    submitting,
    error,
    fetchAll,
    create,
    update,
    remove,
    refetch,
  };
}
