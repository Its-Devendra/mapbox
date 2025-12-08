/**
 * Mapbox Style Agent Service
 * 
 * An intelligent AI-powered service that generates complete map styles
 * based on primary/secondary colors. Uses design principles to create
 * harmonious, professional-looking map themes.
 */

// ============================================================================
// COMPREHENSIVE MAPBOX LAYER CONFIGURATION
// Full control over EVERY visual property in the map
// ============================================================================

export const MAPBOX_LAYERS = {
  // ========================
  // BACKGROUND & LAND
  // ========================
  background: {
    id: 'background',
    layers: ['background'],
    paintProperties: {
      'background-color': { type: 'color', default: '#f8f4f0' },
      'background-opacity': { type: 'number', min: 0, max: 1, default: 1 }
    },
    description: 'Base map background'
  },
  
  land: {
    id: 'land',
    layers: ['land', 'landcover', 'landuse'],
    paintProperties: {
      'fill-color': { type: 'color', default: '#f5f5f3' },
      'fill-opacity': { type: 'number', min: 0, max: 1, default: 1 }
    },
    description: 'Land areas and landcover'
  },

  // ========================
  // WATER FEATURES
  // ========================
  water: {
    id: 'water',
    layers: ['water', 'water-shadow'],
    paintProperties: {
      'fill-color': { type: 'color', default: '#a0c4e8' },
      'fill-opacity': { type: 'number', min: 0, max: 1, default: 1 }
    },
    description: 'Oceans, lakes, ponds'
  },
  
  waterway: {
    id: 'waterway',
    layers: ['waterway', 'waterway-shadow'],
    paintProperties: {
      'line-color': { type: 'color', default: '#a0c4e8' },
      'line-width': { type: 'number', min: 0, max: 10, default: 1 },
      'line-opacity': { type: 'number', min: 0, max: 1, default: 1 }
    },
    description: 'Rivers, streams, canals'
  },

  // ========================
  // ROADS - FULL HIERARCHY
  // ========================
  roadMotorway: {
    id: 'roadMotorway',
    layers: ['road-motorway-trunk', 'road-motorway-trunk-case', 'road-motorway', 'road-motorway-case'],
    paintProperties: {
      'line-color': { type: 'color', default: '#fc8a5b' },
      'line-width': { type: 'number', min: 0, max: 20, default: 3 },
      'line-opacity': { type: 'number', min: 0, max: 1, default: 1 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' },
      'line-cap': { type: 'enum', values: ['butt', 'round', 'square'], default: 'round' },
      'line-join': { type: 'enum', values: ['bevel', 'round', 'miter'], default: 'round' }
    },
    description: 'Motorways and trunk roads (highways)'
  },
  
  roadPrimary: {
    id: 'roadPrimary',
    layers: ['road-primary', 'road-primary-case'],
    paintProperties: {
      'line-color': { type: 'color', default: '#fcd6a4' },
      'line-width': { type: 'number', min: 0, max: 15, default: 2.5 },
      'line-opacity': { type: 'number', min: 0, max: 1, default: 1 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' }
    },
    description: 'Primary roads (main arterials)'
  },
  
  roadSecondary: {
    id: 'roadSecondary',
    layers: ['road-secondary-tertiary', 'road-secondary-tertiary-case'],
    paintProperties: {
      'line-color': { type: 'color', default: '#ffffff' },
      'line-width': { type: 'number', min: 0, max: 12, default: 2 },
      'line-opacity': { type: 'number', min: 0, max: 1, default: 1 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' }
    },
    description: 'Secondary and tertiary roads'
  },
  
  roadStreet: {
    id: 'roadStreet',
    layers: ['road-street', 'road-street-case', 'road-minor', 'road-minor-case', 'road-street-low'],
    paintProperties: {
      'line-color': { type: 'color', default: '#ffffff' },
      'line-width': { type: 'number', min: 0, max: 10, default: 1.5 },
      'line-opacity': { type: 'number', min: 0, max: 1, default: 1 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' }
    },
    description: 'Local streets and minor roads'
  },
  
  roadPath: {
    id: 'roadPath',
    layers: ['road-path', 'road-pedestrian', 'road-footway', 'road-steps'],
    paintProperties: {
      'line-color': { type: 'color', default: '#d4d4d4' },
      'line-width': { type: 'number', min: 0, max: 5, default: 1 },
      'line-opacity': { type: 'number', min: 0, max: 1, default: 0.8 },
      'line-dasharray': { type: 'array', default: [2, 1] }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' }
    },
    description: 'Paths, footways, and pedestrian areas'
  },

  // ========================
  // BUILDINGS
  // ========================
  building: {
    id: 'building',
    layers: ['building', 'building-outline'],
    paintProperties: {
      'fill-color': { type: 'color', default: '#dfdbd7' },
      'fill-opacity': { type: 'number', min: 0, max: 1, default: 0.8 },
      'fill-outline-color': { type: 'color', default: '#c9c5c1' }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' }
    },
    description: '2D building footprints'
  },
  
  building3d: {
    id: 'building3d',
    layers: ['3d-buildings', 'building-extrusion'],
    paintProperties: {
      'fill-extrusion-color': { type: 'color', default: '#dfdbd7' },
      'fill-extrusion-opacity': { type: 'number', min: 0, max: 1, default: 0.6 },
      'fill-extrusion-height': { type: 'expression', default: ['get', 'height'] },
      'fill-extrusion-base': { type: 'expression', default: ['get', 'min_height'] }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' }
    },
    description: '3D extruded buildings'
  },

  // ========================
  // LABELS - PLACES
  // ========================
  labelCountry: {
    id: 'labelCountry',
    layers: ['country-label'],
    paintProperties: {
      'text-color': { type: 'color', default: '#334e5c' },
      'text-halo-color': { type: 'color', default: '#ffffff' },
      'text-halo-width': { type: 'number', min: 0, max: 3, default: 1 },
      'text-opacity': { type: 'number', min: 0, max: 1, default: 1 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' },
      'text-size': { type: 'number', min: 8, max: 36, default: 14 },
      'text-font': { type: 'array', default: ['DIN Pro Medium', 'Arial Unicode MS Bold'] },
      'text-transform': { type: 'enum', values: ['none', 'uppercase', 'lowercase'], default: 'none' },
      'text-letter-spacing': { type: 'number', min: 0, max: 0.5, default: 0.1 }
    },
    description: 'Country name labels'
  },
  
  labelState: {
    id: 'labelState',
    layers: ['state-label'],
    paintProperties: {
      'text-color': { type: 'color', default: '#334e5c' },
      'text-halo-color': { type: 'color', default: '#ffffff' },
      'text-halo-width': { type: 'number', min: 0, max: 3, default: 1 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' },
      'text-size': { type: 'number', min: 8, max: 24, default: 12 }
    },
    description: 'State/province labels'
  },
  
  labelCity: {
    id: 'labelCity',
    layers: ['place-city-label', 'settlement-label', 'settlement-major-label'],
    paintProperties: {
      'text-color': { type: 'color', default: '#2a2a2a' },
      'text-halo-color': { type: 'color', default: '#ffffff' },
      'text-halo-width': { type: 'number', min: 0, max: 3, default: 1.2 },
      'text-opacity': { type: 'number', min: 0, max: 1, default: 1 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' },
      'text-size': { type: 'number', min: 8, max: 28, default: 14 },
      'text-font': { type: 'array', default: ['DIN Pro Medium', 'Arial Unicode MS Bold'] }
    },
    description: 'City and town labels'
  },
  
  labelNeighborhood: {
    id: 'labelNeighborhood',
    layers: ['place-neighborhood-label', 'place-label', 'settlement-subdivision-label'],
    paintProperties: {
      'text-color': { type: 'color', default: '#666666' },
      'text-halo-color': { type: 'color', default: '#ffffff' },
      'text-halo-width': { type: 'number', min: 0, max: 2, default: 0.8 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' },
      'text-size': { type: 'number', min: 8, max: 16, default: 11 }
    },
    description: 'Neighborhood and locality labels'
  },

  // ========================
  // LABELS - ROADS
  // ========================
  labelRoad: {
    id: 'labelRoad',
    layers: ['road-label', 'road-number-shield'],
    paintProperties: {
      'text-color': { type: 'color', default: '#666666' },
      'text-halo-color': { type: 'color', default: '#ffffff' },
      'text-halo-width': { type: 'number', min: 0, max: 2, default: 1 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' },
      'text-size': { type: 'number', min: 8, max: 16, default: 10 }
    },
    description: 'Road name labels'
  },

  // ========================
  // LABELS - POI
  // ========================
  labelPoi: {
    id: 'labelPoi',
    layers: ['poi-label'],
    paintProperties: {
      'text-color': { type: 'color', default: '#666666' },
      'text-halo-color': { type: 'color', default: '#ffffff' },
      'text-halo-width': { type: 'number', min: 0, max: 2, default: 0.8 },
      'icon-opacity': { type: 'number', min: 0, max: 1, default: 1 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' },
      'text-size': { type: 'number', min: 8, max: 14, default: 10 },
      'icon-size': { type: 'number', min: 0.5, max: 2, default: 1 }
    },
    description: 'Points of interest labels and icons'
  },

  // ========================
  // PARKS & NATURE
  // ========================
  park: {
    id: 'park',
    layers: ['landuse-park', 'park', 'national-park'],
    paintProperties: {
      'fill-color': { type: 'color', default: '#b8e6b8' },
      'fill-opacity': { type: 'number', min: 0, max: 1, default: 0.8 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' }
    },
    description: 'Parks and green spaces'
  },
  
  landusePitch: {
    id: 'landusePitch',
    layers: ['landuse-pitch', 'pitch-outline'],
    paintProperties: {
      'fill-color': { type: 'color', default: '#aadeaa' },
      'fill-opacity': { type: 'number', min: 0, max: 1, default: 0.8 }
    },
    description: 'Sports pitches and fields'
  },

  // ========================
  // TRANSIT
  // ========================
  transit: {
    id: 'transit',
    layers: ['transit-label', 'airport-label', 'rail-label'],
    paintProperties: {
      'text-color': { type: 'color', default: '#5c5c5c' },
      'text-halo-color': { type: 'color', default: '#ffffff' },
      'text-halo-width': { type: 'number', min: 0, max: 2, default: 1 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' },
      'text-size': { type: 'number', min: 8, max: 14, default: 10 }
    },
    description: 'Transit stations and airports'
  },
  
  railway: {
    id: 'railway',
    layers: ['railway', 'rail', 'transit-rail'],
    paintProperties: {
      'line-color': { type: 'color', default: '#999999' },
      'line-width': { type: 'number', min: 0, max: 5, default: 1 },
      'line-opacity': { type: 'number', min: 0, max: 1, default: 1 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' }
    },
    description: 'Railway lines'
  },

  // ========================
  // BOUNDARIES
  // ========================
  boundaryCountry: {
    id: 'boundaryCountry',
    layers: ['admin-0-boundary', 'admin-0-boundary-disputed', 'admin-0-boundary-bg'],
    paintProperties: {
      'line-color': { type: 'color', default: '#8c8c8c' },
      'line-width': { type: 'number', min: 0, max: 5, default: 1.5 },
      'line-opacity': { type: 'number', min: 0, max: 1, default: 1 }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' }
    },
    description: 'Country borders'
  },
  
  boundaryState: {
    id: 'boundaryState',
    layers: ['admin-1-boundary', 'admin-1-boundary-bg'],
    paintProperties: {
      'line-color': { type: 'color', default: '#a0a0a0' },
      'line-width': { type: 'number', min: 0, max: 3, default: 1 },
      'line-opacity': { type: 'number', min: 0, max: 1, default: 0.8 },
      'line-dasharray': { type: 'array', default: [3, 1] }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' }
    },
    description: 'State/province borders'
  },

  // ========================
  // AEROWAY
  // ========================
  aeroway: {
    id: 'aeroway',
    layers: ['aeroway-runway', 'aeroway-taxiway', 'aeroway-polygon'],
    paintProperties: {
      'fill-color': { type: 'color', default: '#d4d4d4' },
      'line-color': { type: 'color', default: '#d4d4d4' }
    },
    layoutProperties: {
      'visibility': { type: 'enum', values: ['visible', 'none'], default: 'visible' }
    },
    description: 'Airport runways and taxiways'
  }
};

// Color utility functions
export function hexToHSL(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Adjust color lightness
export function adjustLightness(hex, amount) {
  const hsl = hexToHSL(hex);
  if (!hsl) return hex;
  const newL = Math.max(0, Math.min(100, hsl.l + amount));
  return hslToHex(hsl.h, hsl.s, newL);
}

// Adjust color saturation  
export function adjustSaturation(hex, amount) {
  const hsl = hexToHSL(hex);
  if (!hsl) return hex;
  const newS = Math.max(0, Math.min(100, hsl.s + amount));
  return hslToHex(hsl.h, newS, hsl.l);
}

// Get contrasting color for text
export function getContrastColor(hex) {
  const hsl = hexToHSL(hex);
  if (!hsl) return '#ffffff';
  return hsl.l > 50 ? '#1a1a1a' : '#ffffff';
}

// Check if color is dark
export function isDarkColor(hex) {
  const hsl = hexToHSL(hex);
  return hsl ? hsl.l < 50 : false;
}

/**
 * AI Style Agent - Generates complete map styles intelligently
 * 
 * This function acts like a professional designer, making smart decisions
 * about every map element based on the primary and secondary colors.
 */
export function generateIntelligentStyle(primaryColor, secondaryColor, options = {}) {
  const {
    mode = 'auto', // 'auto', 'light', 'dark'
    intensity = 'normal', // 'subtle', 'normal', 'vibrant'
    showLabels = true,
    showPOI = true,
    show3DBuildings = true
  } = options;

  const primaryHSL = hexToHSL(primaryColor);
  const secondaryHSL = hexToHSL(secondaryColor);
  
  if (!primaryHSL || !secondaryHSL) {
    throw new Error('Invalid color format');
  }

  // Determine if we should use dark or light mode
  const isDarkMode = mode === 'dark' || (mode === 'auto' && isDarkColor(primaryColor));
  
  // Intensity multiplier
  const intensityMultiplier = intensity === 'subtle' ? 0.6 : intensity === 'vibrant' ? 1.4 : 1;

  // Generate the complete color palette intelligently
  const palette = generateDesignPalette(primaryColor, secondaryColor, isDarkMode, intensityMultiplier);
  
  // Generate style modifications
  const modifications = [];
  
  // === BACKGROUND ===
  modifications.push({
    category: 'background',
    layer: 'background',
    property: 'background-color',
    value: palette.background,
    description: 'Map background'
  });
  
  // === LAND ===
  modifications.push({
    category: 'land',
    layer: 'land',
    property: 'fill-color',
    value: palette.land,
    description: 'Land color'
  });
  
  // === WATER ===
  modifications.push({
    category: 'water',
    layer: 'water',
    property: 'fill-color',
    value: palette.water,
    description: 'Water bodies'
  });
  
  // === ROADS ===
  // Highway - most prominent
  modifications.push({
    category: 'roads',
    layer: 'roadHighway',
    property: 'line-color',
    value: palette.roadHighway,
    description: 'Highways'
  });
  
  // Primary roads
  modifications.push({
    category: 'roads',
    layer: 'roadPrimary',
    property: 'line-color',
    value: palette.roadPrimary,
    description: 'Primary roads'
  });
  
  // Secondary roads
  modifications.push({
    category: 'roads',
    layer: 'roadSecondary',
    property: 'line-color',
    value: palette.roadSecondary,
    description: 'Secondary roads'
  });
  
  // Local streets
  modifications.push({
    category: 'roads',
    layer: 'roadStreet',
    property: 'line-color',
    value: palette.roadStreet,
    description: 'Local streets'
  });
  
  // === BUILDINGS ===
  modifications.push({
    category: 'buildings',
    layer: 'building',
    property: 'fill-color',
    value: palette.building,
    description: '2D Buildings'
  });
  
  if (show3DBuildings) {
    modifications.push({
      category: 'buildings',
      layer: 'building3d',
      property: 'fill-extrusion-color',
      value: palette.building3d,
      description: '3D Buildings'
    });
  }
  
  // === PARKS ===
  modifications.push({
    category: 'nature',
    layer: 'park',
    property: 'fill-color',
    value: palette.park,
    description: 'Parks and green spaces'
  });
  
  // === LABELS ===
  if (showLabels) {
    modifications.push({
      category: 'labels',
      layer: 'placeLabel',
      property: 'text-color',
      value: palette.labelPrimary,
      description: 'Place labels'
    });
    
    modifications.push({
      category: 'labels',
      layer: 'roadLabel',
      property: 'text-color',
      value: palette.labelSecondary,
      description: 'Road labels'
    });
  } else {
    // Hide all labels
    modifications.push({
      category: 'labels',
      layer: 'placeLabel',
      property: 'visibility',
      value: 'none',
      description: 'Hide place labels'
    });
    modifications.push({
      category: 'labels',
      layer: 'roadLabel',
      property: 'visibility',
      value: 'none',
      description: 'Hide road labels'
    });
  }
  
  // === POI ===
  if (!showPOI) {
    modifications.push({
      category: 'poi',
      layer: 'poiLabel',
      property: 'visibility',
      value: 'none',
      description: 'Hide POI labels'
    });
  } else {
    modifications.push({
      category: 'poi',
      layer: 'poiLabel',
      property: 'text-color',
      value: palette.poi,
      description: 'POI labels'
    });
  }
  
  // === BOUNDARIES ===
  modifications.push({
    category: 'boundaries',
    layer: 'boundary',
    property: 'line-color',
    value: palette.boundary,
    description: 'Administrative boundaries'
  });

  return {
    baseStyle: isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
    modifications,
    palette,
    metadata: {
      primaryColor,
      secondaryColor,
      mode: isDarkMode ? 'dark' : 'light',
      intensity,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate a harmonious design palette based on primary/secondary colors
 * This is where the "AI designer brain" makes smart decisions
 */
function generateDesignPalette(primary, secondary, isDark, intensity) {
  const primaryHSL = hexToHSL(primary);
  const secondaryHSL = hexToHSL(secondary);
  
  if (isDark) {
    // === DARK MODE PALETTE ===
    return {
      // Background: Very dark version of primary
      background: adjustLightness(primary, -40),
      
      // Land: Slightly lighter than background
      land: adjustLightness(primary, -35),
      
      // Water: Use primary color with adjusted saturation for elegance
      water: adjustSaturation(adjustLightness(primary, -20), 30 * intensity),
      
      // Roads hierarchy - secondary color based with varying lightness
      roadHighway: secondary, // Most prominent - use secondary directly
      roadPrimary: adjustLightness(secondary, -10),
      roadSecondary: adjustLightness(secondary, -20),
      roadStreet: adjustLightness(primary, 20),
      
      // Buildings: Subtle, darker than land
      building: adjustLightness(primary, -25),
      building3d: adjustLightness(primary, -15),
      
      // Parks: Green tinted version of primary (or actual green if primary is too far from green)
      park: generateParkColor(primary, isDark, intensity),
      
      // Labels: High contrast for readability
      labelPrimary: secondary,
      labelSecondary: adjustLightness(secondary, -15),
      
      // POI: Subtle secondary
      poi: adjustLightness(secondary, -20),
      
      // Boundary: Very subtle
      boundary: adjustLightness(primary, 30)
    };
  } else {
    // === LIGHT MODE PALETTE ===
    return {
      // Background: Very light, almost white with primary tint
      background: adjustLightness(primary, 45),
      
      // Land: Slightly darker than background
      land: adjustLightness(primary, 40),
      
      // Water: Vibrant version of primary
      water: adjustSaturation(adjustLightness(primary, 10), 40 * intensity),
      
      // Roads hierarchy
      roadHighway: adjustLightness(secondary, -20), // Darker for visibility
      roadPrimary: adjustLightness(secondary, -10),
      roadSecondary: adjustLightness(secondary, 10),
      roadStreet: adjustLightness(primary, -10),
      
      // Buildings: Light, subtle
      building: adjustLightness(primary, 25),
      building3d: adjustLightness(primary, 15),
      
      // Parks
      park: generateParkColor(primary, isDark, intensity),
      
      // Labels: Dark for readability
      labelPrimary: adjustLightness(primary, -40),
      labelSecondary: adjustLightness(primary, -25),
      
      // POI
      poi: adjustLightness(secondary, -15),
      
      // Boundary: Subtle
      boundary: adjustLightness(primary, -20)
    };
  }
}

/**
 * Generate an appropriate park/green space color
 * Tries to harmonize with primary color while maintaining "green space" feel
 */
function generateParkColor(primary, isDark, intensity) {
  const primaryHSL = hexToHSL(primary);
  
  // If primary is already greenish (hue between 80-160), use a variation
  if (primaryHSL.h >= 80 && primaryHSL.h <= 160) {
    return isDark 
      ? adjustLightness(primary, -15) 
      : adjustLightness(primary, 15);
  }
  
  // Otherwise, create a green that harmonizes with primary
  const greenHue = 120; // Pure green
  const blendedHue = (primaryHSL.h + greenHue) / 2; // Blend towards primary
  
  const saturation = Math.min(50 * intensity, 70);
  const lightness = isDark ? 25 : 70;
  
  return hslToHex(blendedHue, saturation, lightness);
}

/**
 * Apply style modifications to a Mapbox map instance
 */
export function applyStylesToMap(map, styleData) {
  if (!map || !styleData?.modifications) return;
  
  const results = {
    applied: [],
    failed: []
  };
  
  styleData.modifications.forEach(mod => {
    const layerConfig = MAPBOX_LAYERS[mod.layer];
    if (!layerConfig) {
      results.failed.push({ ...mod, reason: 'Unknown layer' });
      return;
    }
    
    layerConfig.layers.forEach(layerId => {
      try {
        // Check if layer exists
        if (!map.getLayer(layerId)) {
          return; // Skip non-existent layers silently
        }
        
        if (mod.property === 'visibility') {
          map.setLayoutProperty(layerId, 'visibility', mod.value);
        } else if (mod.property.includes('extrusion')) {
          map.setPaintProperty(layerId, mod.property, mod.value);
        } else if (mod.property.includes('text')) {
          map.setPaintProperty(layerId, mod.property, mod.value);
        } else {
          map.setPaintProperty(layerId, mod.property, mod.value);
        }
        
        results.applied.push({ layerId, ...mod });
      } catch (error) {
        // Layer might not exist in current style - this is okay
        console.debug(`Could not apply to ${layerId}:`, error.message);
      }
    });
  });
  
  return results;
}

/**
 * Generate style based on a text prompt using AI
 * This uses the Gemini API to understand natural language style requests
 */
export async function generateStyleFromPrompt(prompt, currentPrimary, currentSecondary) {
  const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    // Fallback: Parse prompt locally without AI
    return parsePromptLocally(prompt, currentPrimary, currentSecondary);
  }
  
  const systemPrompt = `You are an expert map designer AI. Given a user's description, generate map styling parameters.

Current colors:
- Primary: ${currentPrimary}
- Secondary: ${currentSecondary}

Respond ONLY with a JSON object (no markdown, no explanation) with these properties:
{
  "primaryColor": "#hexcode or null to keep current",
  "secondaryColor": "#hexcode or null to keep current", 
  "mode": "dark" | "light" | "auto",
  "intensity": "subtle" | "normal" | "vibrant",
  "showLabels": true | false,
  "showPOI": true | false,
  "show3DBuildings": true | false
}

Examples:
- "Dark elegant theme" → dark mode, subtle intensity
- "Vibrant colorful map" → vibrant intensity
- "Minimal clean look" → hide POI, subtle intensity
- "Real estate focus" → hide POI, show buildings prominently`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\nUser request: "${prompt}"` }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
          }
        })
      }
    );
    
    if (!response.ok) {
      throw new Error('AI request failed');
    }
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const params = JSON.parse(jsonMatch[0]);
      return generateIntelligentStyle(
        params.primaryColor || currentPrimary,
        params.secondaryColor || currentSecondary,
        {
          mode: params.mode || 'auto',
          intensity: params.intensity || 'normal',
          showLabels: params.showLabels ?? true,
          showPOI: params.showPOI ?? true,
          show3DBuildings: params.show3DBuildings ?? true
        }
      );
    }
    
    throw new Error('Could not parse AI response');
  } catch (error) {
    console.error('AI style generation failed:', error);
    // Fallback to local parsing
    return parsePromptLocally(prompt, currentPrimary, currentSecondary);
  }
}

/**
 * Local prompt parsing fallback (when AI is not available)
 */
function parsePromptLocally(prompt, primary, secondary) {
  const lowerPrompt = prompt.toLowerCase();
  
  const options = {
    mode: 'auto',
    intensity: 'normal',
    showLabels: true,
    showPOI: true,
    show3DBuildings: true
  };
  
  // Detect mode
  if (lowerPrompt.includes('dark') || lowerPrompt.includes('night')) {
    options.mode = 'dark';
  } else if (lowerPrompt.includes('light') || lowerPrompt.includes('bright')) {
    options.mode = 'light';
  }
  
  // Detect intensity
  if (lowerPrompt.includes('subtle') || lowerPrompt.includes('minimal') || lowerPrompt.includes('clean')) {
    options.intensity = 'subtle';
  } else if (lowerPrompt.includes('vibrant') || lowerPrompt.includes('colorful') || lowerPrompt.includes('bold')) {
    options.intensity = 'vibrant';
  }
  
  // Detect visibility preferences
  if (lowerPrompt.includes('no label') || lowerPrompt.includes('hide label')) {
    options.showLabels = false;
  }
  if (lowerPrompt.includes('no poi') || lowerPrompt.includes('hide poi') || lowerPrompt.includes('real estate')) {
    options.showPOI = false;
  }
  
  return generateIntelligentStyle(primary, secondary, options);
}

export default {
  generateIntelligentStyle,
  generateStyleFromPrompt,
  applyStylesToMap,
  MAPBOX_LAYERS
};
