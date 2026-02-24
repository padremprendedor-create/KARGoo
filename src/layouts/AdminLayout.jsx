import React from 'react';
import AdminSidebar from '../components/AdminSidebar';

const AdminLayout = ({ children }) => {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#F9FAFB' }}>
            <AdminSidebar />
            <main style={{ flex: 1, overflowX: 'hidden' }}>
                {children}
            </main>
        </div>
    );
};

export default AdminLayout;
