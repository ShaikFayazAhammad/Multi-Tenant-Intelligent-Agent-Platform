import { useState, useEffect } from 'react';
import apiClient, { clearStoredSession, getStoredSession, UserSession } from '../services/apiClient';

export const useAuth = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedSession = getStoredSession();
    setSession(storedSession);
    setIsLoading(false);
  }, []);

  const isAuthenticated = !!session?.user?.access_token;

  const logout = () => {
    clearStoredSession();
    setSession(null);
    window.location.href = '/login';
  };

  return {
    session,
    isAuthenticated,
    isLoading,
    logout,
  };
};

// Example API functions using the configured client
export const api = {
  // Example: Get user profile
  getUserProfile: () => apiClient.get('/connect/userinfo'),

  // Example: Get available meeting rooms
  getAvailableRooms: (params: { spaceTypeId?: string; date?: string }) =>
    apiClient.get('/iwaa-workspaces/GetAvailability', { params }),

  // Example: Book a meeting room
  bookRoom: (data: Record<string, unknown>) => apiClient.post('/iwaa-workspaces/bookings', data),

  // Example: Create notification
  createNotification: (data: Record<string, unknown>) => apiClient.post('/notification/create', data),

  // Example: Get pantry menu
  getPantryMenu: (params: { type?: string }) =>
    apiClient.get('/yarooms/services', { params }),
};
