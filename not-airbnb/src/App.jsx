import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/Search';
import PropertyListing from './pages/PropertyListing';
import ListingsPage from './pages/ListingsPage';
import ChatPage from './pages/ChatPage';
import CartPage from './pages/CartPage';
import BookingsPage from './pages/BookingsPage';
import AccountPage from './pages/AccountPage';
import SupportPage from './pages/SupportPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <DataProvider>
          <div className="min-h-screen bg-gray-50">
            <NavBar />
            <Routes>
              <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/listing/:id" element={<PropertyListing />} />
              <Route
                path="/listings"
                element={
                  <ProtectedRoute>
                    <ListingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
            <Route path="*" element={<p className="p-8">Page not found.</p>} /></Routes>
            <footer className="max-w-7xl mx-auto mt-12 px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-200 flex flex-wrap justify-between gap-3 text-sm text-gray-500"><span className="font-semibold text-rose-500">notAirbnb</span><span>A portfolio booking experience. Payments are simulated.</span></footer>
          </div>
        </DataProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
