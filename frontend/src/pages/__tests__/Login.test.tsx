import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../../pages/Login';
import { BrowserRouter } from 'react-router-dom';
import * as api from '../../services/apiClient';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Login flow – UI test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('logs in and redirects to chat page', async () => {
    render(<Login />, { wrapper: Wrapper });

    await userEvent.type(screen.getByPlaceholderText(/you@/i), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText(/••••/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /Governance/i }));
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(api.loginUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });

    await waitFor(() => expect(window.location.pathname).toBe('/'));

    const stored = (api.updateStoredSession as jest.Mock).mock.calls[0][0];
    expect(stored.user.full_name).toBe('Test User');
    expect(stored.location.room).toBe('Governance');
  });
});
