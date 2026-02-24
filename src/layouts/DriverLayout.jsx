import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BottomNav from '../components/ui/BottomNav';

const DriverLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab based on current path
    const getActiveTab = (pathname) => {
        if (pathname.startsWith('/driver/history')) return 'history';
        if (pathname.startsWith('/driver/reports')) return 'reports';
        if (pathname.startsWith('/driver/profile')) return 'profile';
        if (pathname === '/driver') return 'home';
        return 'home'; // Default
    };

    const handleNavigate = (id) => {
        switch (id) {
            case 'home':
                navigate('/driver');
                break;
            case 'history':
                navigate('/driver/history');
                break;
            case 'reports':
                navigate('/driver/reports');
                break;
            case 'profile':
                navigate('/driver/profile');
                break;
            default:
                break;
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-light)',
            paddingBottom: 'calc(var(--bottom-nav-height) + 1rem)', // Space for fixed bottom nav
            display: 'flex',
            flexDirection: 'column',
        }}>
            <Outlet />
            <BottomNav
                active={getActiveTab(location.pathname)}
                onNavigate={handleNavigate}
            />
        </div>
    );
};

export default DriverLayout;
