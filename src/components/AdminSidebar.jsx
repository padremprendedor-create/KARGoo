import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Truck, Users, LogOut, Settings, Map, Clock, Building2 } from 'lucide-react';
import Button from './ui/Button';
import { supabase } from '../supabaseClient';
import logo from '../assets/logo.png';

const AdminSidebar = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const navItems = [
        { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { path: '/admin/trips', icon: <Truck size={20} />, label: 'Viajes' },
        { path: '/admin/drivers', icon: <Users size={20} />, label: 'Conductores' },
        { path: '/admin/timeline', icon: <Clock size={20} />, label: 'Timeline' },
        { path: '/admin/rutas', icon: <Map size={20} />, label: 'Rutas' },
        { path: '/admin/vehicles', icon: <Settings size={20} />, label: 'Vehículos' },
        { path: '/admin/clients', icon: <Building2 size={20} />, label: 'Clientes' },
    ];

    return (
        <aside style={{
            width: '260px',
            background: 'white',
            borderRight: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            position: 'sticky',
            top: 0
        }}>
            <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img
                        src={logo}
                        alt="KARGoo"
                        style={{
                            height: '40px',
                            objectFit: 'contain'
                        }}
                    />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem', fontWeight: '500' }}>
                    ADMINISTRACIÓN
                </div>
            </div>

            <nav style={{ flex: 1, padding: '1.5rem 1rem' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {navItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                end={item.path === '/admin'}
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.875rem 1rem',
                                    background: isActive ? '#FFF7ED' : 'transparent',
                                    color: isActive ? 'var(--primary-red)' : 'var(--text-medium)',
                                    borderRadius: '12px',
                                    textDecoration: 'none',
                                    fontWeight: isActive ? '600' : '500',
                                    transition: 'all 0.2s ease',
                                    border: isActive ? '1px solid rgba(211, 47, 47, 0.1)' : '1px solid transparent'
                                })}
                            >
                                {item.icon}
                                {item.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div style={{ padding: '1.5rem', borderTop: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#FECACA',
                        color: '#DC2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700'
                    }}>
                        A
                    </div>
                    <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-dark)' }}>Admin User</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Logística</div>
                    </div>
                </div>
                <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50">
                    <LogOut size={20} className="mr-2" />
                    Cerrar Sesión
                </Button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
