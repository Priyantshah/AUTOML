import React from 'react';
import { Moon, Sun } from 'lucide-react';
import './ThemeToggle.css';

export function ThemeToggle({ theme, toggleTheme, className = '' }) {
    const isDark = theme === 'dark';

    return (
        <div
            className={`theme-toggle-container ${isDark ? 'dark' : 'light'} ${className}`}
            onClick={toggleTheme}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    toggleTheme();
                }
            }}
        >
            <div className="toggle-track">
                {/* The moving thumb */}
                <div className="toggle-thumb">
                    {isDark ? (
                        <Moon
                            className="w-4 h-4 icon-white"
                            size={14}
                            strokeWidth={1.5}
                        />
                    ) : (
                        <Sun
                            className="w-4 h-4 icon-gray-700"
                            size={14}
                            strokeWidth={1.5}
                        />
                    )}
                </div>

                {/* Background Icons */}
                <div className="toggle-icon-wrapper right">
                    {isDark ? (
                        <Sun
                            className="w-4 h-4 icon-gray-500"
                            size={14}
                            strokeWidth={1.5}
                        />
                    ) : null}
                </div>

                <div className="toggle-icon-wrapper left">
                    {!isDark ? (
                        <Moon
                            className="w-4 h-4 icon-black"
                            size={14}
                            strokeWidth={1.5}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
