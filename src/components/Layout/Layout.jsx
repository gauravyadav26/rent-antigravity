import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import PlotTabs from './PlotTabs';
import ErrorBoundary from '../ErrorBoundary';
import { useApp } from '../../context/AppContext';

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { theme } = useApp();

    return (
        <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}
            style={{ background: theme === 'dark' ? '#0f172a' : '#f8fafc', color: theme === 'dark' ? '#f1f5f9' : '#1e293b' }}>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 modal-backdrop lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main content */}
            <div className="lg:ml-64 flex flex-col min-h-screen">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <PlotTabs />
                <main className="flex-1 p-4 md:p-6 animate-fade-in">
                    <ErrorBoundary>
                        <Outlet />
                    </ErrorBoundary>
                </main>
            </div>
        </div>
    );
}
