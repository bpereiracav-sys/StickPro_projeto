import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clubApi } from '../services/api';

const ThemeContext = createContext(null);

// Convert hex to HSL for CSS variables
function hexToHSL(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse RGB values
  let r = parseInt(hex.slice(0, 2), 16) / 255;
  let g = parseInt(hex.slice(2, 4), 16) / 255;
  let b = parseInt(hex.slice(4, 6), 16) / 255;

  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      default: h = 0;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

// Default theme colors
const DEFAULT_THEME = {
  primary: '#006D5B',
  secondary: '#FFD700',
  accent: '#1a1a2e',
  mode: 'light'
};

// Get initial theme from localStorage or default
function getInitialTheme() {
  try {
    const stored = localStorage.getItem('stickpro-theme');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading theme from localStorage:', e);
  }
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [loading, setLoading] = useState(false);

  // Apply theme to CSS variables whenever theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const applyTheme = (themeColors) => {
    const root = document.documentElement;
    const isDark = themeColors.mode === 'dark';
    
    // Apply dark/light mode classes
    if (isDark) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      
      // Dark mode base colors - white text for body, green only for titles
      root.style.setProperty('--background', '0 0% 7%'); // #111111
      root.style.setProperty('--foreground', '0 0% 95%'); // White text for body
      root.style.setProperty('--card', '0 0% 13%'); // Dark gray cards
      root.style.setProperty('--card-foreground', '0 0% 95%'); // White text in cards
      root.style.setProperty('--popover', '0 0% 10%');
      root.style.setProperty('--popover-foreground', '0 0% 95%');
      root.style.setProperty('--muted', '0 0% 20%');
      root.style.setProperty('--muted-foreground', '0 0% 65%'); // Gray muted text
      root.style.setProperty('--accent', '0 0% 18%');
      root.style.setProperty('--accent-foreground', '0 0% 95%');
      root.style.setProperty('--border', '0 0% 25%');
      root.style.setProperty('--input', '0 0% 20%');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      
      // Light mode base colors
      root.style.setProperty('--background', '0 0% 100%');
      root.style.setProperty('--foreground', '222 47% 11%');
      root.style.setProperty('--card', '0 0% 100%');
      root.style.setProperty('--card-foreground', '222 47% 11%');
      root.style.setProperty('--popover', '0 0% 100%');
      root.style.setProperty('--popover-foreground', '222 47% 11%');
      root.style.setProperty('--muted', '210 40% 96%');
      root.style.setProperty('--muted-foreground', '215 16% 47%');
      root.style.setProperty('--accent', '210 40% 96%');
      root.style.setProperty('--accent-foreground', '222 47% 11%');
      root.style.setProperty('--border', '214 32% 91%');
      root.style.setProperty('--input', '214 32% 91%');
    }
    
    // Convert and apply primary color
    const primaryHSL = hexToHSL(themeColors.primary);
    root.style.setProperty('--primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    root.style.setProperty('--primary-foreground', isDark ? '0 0% 7%' : '0 0% 100%');
    root.style.setProperty('--ring', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    root.style.setProperty('--chart-1', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    
    // Convert and apply secondary color
    const secondaryHSL = hexToHSL(themeColors.secondary);
    root.style.setProperty('--secondary', `${secondaryHSL.h} ${secondaryHSL.s}% ${secondaryHSL.l}%`);
    root.style.setProperty('--secondary-foreground', isDark ? '0 0% 7%' : '0 0% 100%');
    root.style.setProperty('--chart-2', `${secondaryHSL.h} ${secondaryHSL.s}% ${secondaryHSL.l}%`);
    
    // Store theme in localStorage for faster initial load
    localStorage.setItem('stickpro-theme', JSON.stringify(themeColors));
  };

  const fetchClubTheme = useCallback(async () => {
    setLoading(true);
    try {
      const response = await clubApi.getAll();
      if (response.data.length > 0) {
        const club = response.data[0];
        if (club.primary_color) {
          setTheme({
            primary: club.primary_color || DEFAULT_THEME.primary,
            secondary: club.secondary_color || DEFAULT_THEME.secondary,
            accent: club.accent_color || DEFAULT_THEME.accent,
            mode: club.theme_mode || 'light'
          });
        }
      }
    } catch (error) {
      // Silently fail - use cached or default theme
      console.log('Using cached/default theme');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const refreshTheme = useCallback(() => {
    fetchClubTheme();
  }, [fetchClubTheme]);

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, refreshTheme, loading }}>
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

export default ThemeContext;
