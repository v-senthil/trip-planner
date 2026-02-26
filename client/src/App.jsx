import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import PlannerPage from './pages/PlannerPage';
import ItineraryPage from './pages/ItineraryPage';
import MyTripsPage from './pages/MyTripsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  // import.meta.env.BASE_URL is set by Vite's `base` config (e.g. "/trip-planner/")
  const basename = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Layout wrapper for all other routes */}
          <Route
            path="/*"
            element={
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/plan" element={<PrivateRoute><PlannerPage /></PrivateRoute>} />
                    <Route path="/itinerary" element={<PrivateRoute><ItineraryPage /></PrivateRoute>} />
                    <Route path="/my-trips" element={<PrivateRoute><MyTripsPage /></PrivateRoute>} />
                    <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
                  </Routes>
                </main>
                <Footer />
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
