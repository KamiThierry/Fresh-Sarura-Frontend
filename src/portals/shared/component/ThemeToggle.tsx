import { Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

const ThemeToggle = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark' || savedTheme === 'light') {
                return savedTheme;
            }
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-white/80 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-600 dark:text-gray-200 transition-all shadow-sm"
            aria-label="Toggle Dark Mode"
        >
            {theme === 'light' ? (
                <Moon size={18} className="text-[#6B7280] dark:text-gray-200" />
            ) : (
                <Sun size={18} className="text-yellow-400" />
            )}
        </button>
    );
};

export default ThemeToggle;
