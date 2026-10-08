import { loginUser, getStoredSession, updateStoredSession, createSessionFromAuthUser, clearStoredSession, isSessionActive } from '../services/apiClient';

// We will replace the real implementation with jest mocks when the test imports this file.

// jest will automatically use this file because it's placed under __mocks__ with the same name.

export const loginUser = jest.fn(async (creds: { email: string; password: string }) => {
  return {
    data: {
      access_token: 'fake-jwt-token',
      token_type: 'bearer',
      user: {
        id: 999,
        email: creds.email,
        full_name: 'Test User',
        employee_id: '',
        department: '',
        role: 'Employee',
        floor: 'Ground Floor',
        room: 'Governance',
      },
    },
  };
});

export const getStoredSession = jest.fn(() => null);
export const updateStoredSession = jest.fn();
export const createSessionFromAuthUser = jest.fn((data: any, location: any) => ({
  user: data.user,
  location,
  lastLoginAt: new Date().toISOString(),
}));
export const clearStoredSession = jest.fn();
export const isSessionActive = jest.fn(() => false);
