import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(() => {
        try {
            return localStorage.getItem('kargoo_dark_mode') === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        const root = document.documentElement;
        if (darkMode) {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }
        localStorage.setItem('kargoo_dark_mode', darkMode);
    }, [darkMode]);

    const toggleDarkMode = () => setDarkMode(prev => !prev);

    return (
        <ThemeContext.Provider value={{ darkMode, setDarkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};
