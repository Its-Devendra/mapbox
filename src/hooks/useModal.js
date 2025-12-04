'use client';

import { useState, useCallback } from 'react';

/**
 * useModal Hook - Modal state management
 * 
 * Features: form state, editing mode, exit confirmation
 */
export default function useModal(initialFormData = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [isDirty, setIsDirty] = useState(false);

  // Open modal for creating new item
  const openCreate = useCallback(() => {
    setEditingItem(null);
    setFormData(initialFormData);
    setIsDirty(false);
    setIsOpen(true);
  }, [initialFormData]);

  // Open modal for editing existing item
  const openEdit = useCallback((item, mapItemToForm = null) => {
    setEditingItem(item);
    setFormData(mapItemToForm ? mapItemToForm(item) : item);
    setIsDirty(false);
    setIsOpen(true);
  }, []);

  // Close modal with optional dirty check
  const close = useCallback((skipConfirm = false) => {
    if (!skipConfirm && isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return false;
      }
    }
    setIsOpen(false);
    setEditingItem(null);
    setFormData(initialFormData);
    setIsDirty(false);
    return true;
  }, [isDirty, initialFormData]);

  // Update form field
  const updateField = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  }, []);

  // Handle input change event
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    let parsedValue = value;
    if (type === 'checkbox') {
      parsedValue = checked;
    } else if (type === 'number' && value !== '') {
      parsedValue = parseFloat(value);
    }
    
    updateField(name, parsedValue);
  }, [updateField]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setIsDirty(false);
  }, [initialFormData]);

  // Set entire form data
  const setForm = useCallback((data) => {
    setFormData(data);
    setIsDirty(true);
  }, []);

  return {
    isOpen,
    editingItem,
    isEditing: editingItem !== null,
    formData,
    isDirty,
    openCreate,
    openEdit,
    close,
    updateField,
    handleInputChange,
    resetForm,
    setForm,
  };
}
