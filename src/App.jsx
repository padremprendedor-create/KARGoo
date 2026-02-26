import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, Truck } from 'lucide-react';
import Button from './components/ui/Button';
import Input from './components/ui/Input';
import DriverDashboard from './pages/DriverDashboard';
import History from './pages/History';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminDrivers from './pages/AdminDrivers';
import AdminTrips from './pages/AdminTrips';
import AdminVehicles from './pages/AdminVehicles';
import AdminRoutes from './pages/AdminRoutes';
import AdminClients from './pages/AdminClients';
import TimelineView from './pages/TimelineView';
import NewTripFlow from './pages/NewTripFlow';
import ActiveTrip from './pages/ActiveTrip';
import WeighingCamera from './pages/WeighingCamera';
import ConfirmWeighing from './pages/ConfirmWeighing';
import TripCompleted from './pages/TripCompleted';
import TripDetails from './pages/TripDetails';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import DriverLayout from './layouts/DriverLayout';
import { supabase } from './supabaseClient';
import logo from './assets/logo.png';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      setLoading(false);
      if (profile?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/driver');
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FFF5ED 0%, var(--bg-light) 40%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      {/* Header / Logo */}
      <div className="animate-fade-in" style={{
        textAlign: 'center',
        marginBottom: '2rem',
      }}>
        <img
          src={logo}
          alt="KARGoo Logo"
          style={{
            height: '80px',
            objectFit: 'contain',
            marginBottom: '1rem'
          }}
        />
        <p style={{
          fontSize: '0.9rem',
          color: 'var(--text-light)',
          margin: 0,
          fontWeight: '400',
        }}>
          Gestión de Transportes
        </p>
      </div>

      {/* Login Card */}
      <div className="animate-fade-in-up" style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'var(--white)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)',
        padding: '2rem',
      }}>
        <h2 style={{
          textAlign: 'center',
          marginBottom: '1.5rem',
          color: 'var(--text-dark)',
          fontSize: '1.25rem',
          fontWeight: '600',
        }}>
          Iniciar Sesión
        </h2>

        <form onSubmit={handleLogin}>
          <Input
            label="Correo Electrónico"
            placeholder="conductor@kargoo.com"
            icon={<Mail size={18} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div style={{
              color: 'var(--danger)',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              background: '#FEE2E2',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '500',
            }}>
              {error}
            </div>
          )}

          <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
            <a href="#" style={{
              fontSize: '0.85rem',
              color: 'var(--primary-red)',
              textDecoration: 'none',
              fontWeight: '500',
            }}>
              ¿Olvidó su contraseña?
            </a>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </div>

      {/* Footer */}
      <p style={{
        marginTop: '2.5rem',
        color: 'var(--text-light)',
        fontSize: '0.8rem',
        textAlign: 'center',
      }}>
        &copy; {new Date().getFullYear()} KARGoo S.A.C
        <br />
        <span style={{ fontSize: '0.7rem' }}>Sistema de Transportes</span>
      </p>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-light)',
        fontSize: '0.9rem',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border-light)',
            borderTop: '3px solid var(--primary-red)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem',
          }} />
          Cargando...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/driver"
          element={
            <ProtectedRoute>
              <DriverLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DriverDashboard />} />
          <Route path="history" element={<History />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route
          path="/driver/new-trip"
          element={
            <ProtectedRoute>
              <NewTripFlow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/trip/:id"
          element={
            <ProtectedRoute>
              <ActiveTrip />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/trip/:id/weighing"
          element={
            <ProtectedRoute>
              <WeighingCamera />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/trip/:id/weighing/confirm"
          element={
            <ProtectedRoute>
              <ConfirmWeighing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/trip/:id/completed"
          element={
            <ProtectedRoute>
              <TripCompleted />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/history/:id"
          element={
            <ProtectedRoute>
              <TripDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/driver/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/drivers"
          element={
            <ProtectedRoute>
              <AdminDrivers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/trips"
          element={
            <ProtectedRoute>
              <AdminTrips />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vehicles"
          element={
            <ProtectedRoute>
              <AdminVehicles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/rutas"
          element={
            <ProtectedRoute>
              <AdminRoutes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/clients"
          element={
            <ProtectedRoute>
              <AdminClients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/timeline"
          element={
            <ProtectedRoute>
              <TimelineView />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
