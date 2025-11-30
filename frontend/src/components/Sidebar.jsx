import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, Table, Target, Brain, BarChart2, FileText } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
    const navItems = [
        { path: '/upload', icon: <Upload size={20} />, label: 'Upload Dataset' },
        { path: '/preview', icon: <Table size={20} />, label: 'Preview Data' },
        { path: '/eda', icon: <Target size={20} />, label: 'EDA & Target' },
        { path: '/train', icon: <Brain size={20} />, label: 'Train Model' },
        { path: '/predict', icon: <FileText size={20} />, label: 'Predict' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>AutoML Builder</h2>
            </div>
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
