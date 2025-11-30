import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText, BarChart2, Cpu, Zap } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import './DashboardLayout.css';

const DashboardLayout = () => {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="logo">
                    <LayoutDashboard size={28} className="text-primary" />
                    <span>AutoML Builder</span>
                </div>

                <nav className="nav-menu">
                    <NavLink to="/upload" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Upload size={20} />
                        <span>Upload Data</span>
                    </NavLink>
                    <NavLink to="/preview" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <FileText size={20} />
                        <span>Preview</span>
                    </NavLink>
                    <NavLink to="/eda" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <BarChart2 size={20} />
                        <span>EDA</span>
                    </NavLink>
                    <NavLink to="/train" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Cpu size={20} />
                        <span>Train Model</span>
                    </NavLink>
                    <NavLink to="/predict" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Zap size={20} />
                        <span>Predict</span>
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <div className="theme-toggle-wrapper">
                        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                        <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
                    </div>
                    <p>© 2025 AutoML Builder</p>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;
