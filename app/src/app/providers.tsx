'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    toggleTheme: () => { },
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof document === 'undefined') {
            return 'light';
        }
        const fromDom = document.documentElement.getAttribute('data-theme');
        if (fromDom === 'light' || fromDom === 'dark') {
            return fromDom;
        }
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
        return prefersDark ? 'dark' : 'light';
    });

    const applyTheme = useCallback((next: Theme) => {
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        document.documentElement.style.colorScheme = next;
        localStorage.setItem('vs-theme', next);
    }, []);

    const toggleTheme = useCallback(() => {
        applyTheme(theme === 'light' ? 'dark' : 'light');
    }, [theme, applyTheme]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
