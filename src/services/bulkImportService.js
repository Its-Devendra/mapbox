/**
 * Bulk Import Service
 * Handles Excel/CSV file parsing and bulk creation of categories, landmarks, and nearby places
 */

import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { PROFESSIONAL_ICONS, getDefaultIconForCategory } from '@/data/professionalIcons';

/**
 * Parse Excel file buffer and extract data from sheets
 * @param {Buffer} buffer - Excel file buffer
 * @returns {Object} - { landmarks: [], nearbyPlaces: [] }
 */
export function parseExcelFile(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const result = {
        landmarks: [],
        nearbyPlaces: [],
        errors: []
    };

    // Look for Landmarks sheet
    const landmarksSheet = workbook.SheetNames.find(name =>
        name.toLowerCase().includes('landmark') || name.toLowerCase() === 'sheet1'
    );

    if (landmarksSheet) {
        const sheet = workbook.Sheets[landmarksSheet];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        data.forEach((row, index) => {
            const landmark = parseLandmarkRow(row, index + 2);
            if (landmark.valid) {
                result.landmarks.push(landmark.data);
            } else {
                result.errors.push({ sheet: 'Landmarks', row: index + 2, error: landmark.error });
            }
        });
    }

    // Look for Nearby Places sheet
    const nearbySheet = workbook.SheetNames.find(name =>
        name.toLowerCase().includes('nearby') || name.toLowerCase().includes('places') || name.toLowerCase() === 'sheet2'
    );

    if (nearbySheet && nearbySheet !== landmarksSheet) {
        const sheet = workbook.Sheets[nearbySheet];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        data.forEach((row, index) => {
            const nearby = parseNearbyRow(row, index + 2);
            if (nearby.valid) {
                result.nearbyPlaces.push(nearby.data);
            } else {
                result.errors.push({ sheet: 'Nearby', row: index + 2, error: nearby.error });
            }
        });
    }

    return result;
}

/**
 * Parse a landmark row from Excel
 */
function parseLandmarkRow(row, rowNum) {
    // Normalize column names (case-insensitive)
    const normalized = {};
    Object.keys(row).forEach(key => {
        normalized[key.toLowerCase().trim()] = row[key];
    });

    const name = normalized.name || normalized.title || normalized['landmark name'] || '';
    const description = normalized.description || normalized.desc || '';
    const latitude = parseFloat(normalized.latitude || normalized.lat || 0);
    const longitude = parseFloat(normalized.longitude || normalized.lng || normalized.long || 0);
    const category = normalized.category || normalized['category name'] || 'Uncategorized';

    if (!name) {
        return { valid: false, error: 'Missing name' };
    }
    if (isNaN(latitude) || isNaN(longitude)) {
        return { valid: false, error: 'Invalid coordinates' };
    }

    return {
        valid: true,
        data: {
            title: name.toString().trim(),
            description: description.toString().trim(),
            latitude,
            longitude,
            categoryName: category.toString().trim()
        }
    };
}

/**
 * Parse a nearby place row from Excel
 */
function parseNearbyRow(row, rowNum) {
    // Normalize column names (case-insensitive)
    const normalized = {};
    Object.keys(row).forEach(key => {
        normalized[key.toLowerCase().trim()] = row[key];
    });

    const name = normalized.name || normalized.title || normalized['place name'] || '';
    const latitude = parseFloat(normalized.latitude || normalized.lat || 0);
    const longitude = parseFloat(normalized.longitude || normalized.lng || normalized.long || 0);
    const category = normalized.category || normalized['category name'] || 'Uncategorized';

    if (!name) {
        return { valid: false, error: 'Missing name' };
    }
    if (isNaN(latitude) || isNaN(longitude)) {
        return { valid: false, error: 'Invalid coordinates' };
    }

    return {
        valid: true,
        data: {
            title: name.toString().trim(),
            latitude,
            longitude,
            categoryName: category.toString().trim()
        }
    };
}

/**
 * Bulk import landmarks and nearby places with auto-category creation
 * @param {string} projectId - Project ID
 * @param {Object} data - { landmarks: [], nearbyPlaces: [] }
 * @returns {Object} - Import results
 */
export async function bulkImport(projectId, data) {
    const results = {
        created: { categories: 0, landmarks: 0, nearbyPlaces: 0 },
        errors: [],
        details: { categories: [], landmarks: [], nearbyPlaces: [] }
    };

    try {
        // Step 1: Get or create all unique categories
        const categoryNames = new Set();
        data.landmarks.forEach(l => categoryNames.add(l.categoryName));
        data.nearbyPlaces.forEach(n => categoryNames.add(n.categoryName));

        const categoryMap = new Map(); // categoryName -> categoryId

        // Get existing categories
        const existingCategories = await prisma.category.findMany({
            where: { projectId }
        });
        existingCategories.forEach(cat => {
            categoryMap.set(cat.name.toLowerCase(), cat.id);
        });

        // Create missing categories
        for (const categoryName of categoryNames) {
            if (!categoryMap.has(categoryName.toLowerCase())) {
                const defaultIcon = getDefaultIconForCategory(categoryName);

                const newCategory = await prisma.category.create({
                    data: {
                        projectId,
                        name: categoryName,
                        icon: defaultIcon?.svg || PROFESSIONAL_ICONS[0].svg,
                        isActive: true,
                        defaultIconWidth: 32,
                        defaultIconHeight: 32
                    }
                });

                categoryMap.set(categoryName.toLowerCase(), newCategory.id);
                results.created.categories++;
                results.details.categories.push(categoryName);
            }
        }

        // Step 2: Create landmarks
        for (const landmark of data.landmarks) {
            try {
                const categoryId = categoryMap.get(landmark.categoryName.toLowerCase());
                if (!categoryId) {
                    results.errors.push({ type: 'landmark', name: landmark.title, error: 'Category not found' });
                    continue;
                }

                await prisma.landmark.create({
                    data: {
                        projectId,
                        categoryId,
                        title: landmark.title,
                        description: landmark.description,
                        latitude: landmark.latitude,
                        longitude: landmark.longitude
                    }
                });

                results.created.landmarks++;
                results.details.landmarks.push(landmark.title);
            } catch (err) {
                results.errors.push({ type: 'landmark', name: landmark.title, error: err.message });
            }
        }

        // Step 3: Create nearby places
        for (const nearby of data.nearbyPlaces) {
            try {
                const categoryId = categoryMap.get(nearby.categoryName.toLowerCase());
                if (!categoryId) {
                    results.errors.push({ type: 'nearby', name: nearby.title, error: 'Category not found' });
                    continue;
                }

                await prisma.nearBy.create({
                    data: {
                        projectId,
                        categoryId,
                        title: nearby.title,
                        latitude: nearby.latitude,
                        longitude: nearby.longitude
                    }
                });

                results.created.nearbyPlaces++;
                results.details.nearbyPlaces.push(nearby.title);
            } catch (err) {
                results.errors.push({ type: 'nearby', name: nearby.title, error: err.message });
            }
        }

        // Invalidate cache
        invalidateCache.landmarks(projectId);
        invalidateCache.nearby(projectId);

        return results;

    } catch (error) {
        console.error('Bulk import error:', error);
        results.errors.push({ type: 'system', error: error.message });
        return results;
    }
}

/**
 * Generate sample Excel template
 * @returns {Buffer} - Excel file buffer
 */
export function generateTemplate() {
    const workbook = XLSX.utils.book_new();

    // Landmarks sheet
    const landmarksData = [
        { Name: 'Central Mall', Description: 'Shopping center with multiple stores', Latitude: 28.4595, Longitude: 77.0266, Category: 'Shopping' },
        { Name: 'City Hospital', Description: 'Multi-specialty hospital', Latitude: 28.4612, Longitude: 77.0289, Category: 'Hospital' },
        { Name: 'Green Park', Description: 'Public park with jogging track', Latitude: 28.4580, Longitude: 77.0245, Category: 'Park' },
    ];
    const landmarksSheet = XLSX.utils.json_to_sheet(landmarksData);
    XLSX.utils.book_append_sheet(workbook, landmarksSheet, 'Landmarks');

    // Nearby Places sheet
    const nearbyData = [
        { Name: 'ABC School', Latitude: 28.4620, Longitude: 77.0300, Category: 'School' },
        { Name: 'XYZ Bank', Latitude: 28.4630, Longitude: 77.0310, Category: 'Bank' },
        { Name: 'Metro Station', Latitude: 28.4640, Longitude: 77.0320, Category: 'Railway' },
    ];
    const nearbySheet = XLSX.utils.json_to_sheet(nearbyData);
    XLSX.utils.book_append_sheet(workbook, nearbySheet, 'Nearby Places');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
