import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

const host = { id: 'host-id', email: 'host@example.com', name: 'Host', role: 'host' };
function response(data, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => data });
}
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  global.fetch = jest.fn(url => {
    if (url === '/api/auth/me') return response({ error: 'Please sign in' }, 401);
    if (url === '/api/listings') return response({ listings: [] });
    throw new Error('Unexpected API request: ' + url);
  });
});
afterEach(() => jest.restoreAllMocks());

test('renders the existing home and navigation without a session', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Welcome to NotAirbnb' })).toBeInTheDocument();
  await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({ credentials: 'include' })));
  expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
});

test('registration submits the selected role and enters a persistent account', async () => {
  window.history.replaceState({}, '', '/register');
  const fallback = global.fetch;
  global.fetch = jest.fn((url, options) => url === '/api/auth/register' ? response({ user: host }, 201) : fallback(url, options));
  render(<App />);
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: host.email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
  fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'host' } });
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
  await screen.findByRole('button', { name: 'Logout' });
  expect(fetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: host.email, password: 'Password123!', role: 'host' }) }));
  expect(screen.getByRole('link', { name: 'My Listings' })).toBeInTheDocument();
});

test('protected routes wait for session restoration and logout clears the account', async () => {
  window.history.replaceState({}, '', '/account');
  let restore;
  const fallback = global.fetch;
  global.fetch = jest.fn((url, options) => {
    if (url === '/api/auth/me') return new Promise(resolve => { restore = resolve; });
    if (url === '/api/auth/logout') return response(null, 204);
    return fallback(url, options);
  });
  render(<App />);
  expect(screen.getByText('Loading your account?')).toBeInTheDocument();
  restore({ ok: true, status: 200, json: async () => ({ user: host }) });
  await screen.findByRole('heading', { name: 'My Account' });
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  await screen.findByRole('link', { name: 'Login' });
  expect(screen.queryByRole('link', { name: 'My Listings' })).not.toBeInTheDocument();
});

test('shows login errors and redirects unauthenticated protected routes', async () => {
  window.history.replaceState({}, '', '/cart');
  const fallback = global.fetch;
  global.fetch = jest.fn((url, options) => url === '/api/auth/login' ? response({ error: 'Invalid email or password' }, 401) : fallback(url, options));
  render(<App />);
  await screen.findByRole('heading', { name: 'Sign in to your account' });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: host.email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
});

test('cart submits requests and displays partial failures without losing remaining items', async () => {
  window.history.replaceState({}, '', '/cart');
  const item = { id: 'item-1', propertyId: 'property-1', title: 'Beach House', checkIn: '2030-01-01', checkOut: '2030-01-03', guests: 2, totalPrice: 250.5 };
  const fallback = global.fetch;
  global.fetch = jest.fn((url, options) => {
    if (url === '/api/auth/me') return response({ user: host });
    if (url === '/api/cart') return response({ items: [item] });
    if (url === '/api/cart/submit') return response({ results: [{ itemId: item.id, error: 'Dates are unavailable' }] });
    return fallback(url, options);
  });
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Submit Booking Requests' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Dates are unavailable');
  expect(screen.getByRole('link', { name: 'Beach House' })).toBeInTheDocument();
});

test('simulates payment without requesting card details or leaving the app', async () => {
  window.history.replaceState({}, '', '/bookings');
  const booking = { id: 'booking-1', propertyId: 'property-1', propertyTitle: 'Demo Stay', hostId: 'different-host', userId: host.id, checkIn: '2030-01-01', checkOut: '2030-01-03', guests: 2, totalPrice: 250.5, status: 'accepted' };
  const fallback = global.fetch;
  global.fetch = jest.fn((url, options) => {
    if (url === '/api/auth/me') return response({ user: host });
    if (url === '/api/bookings') return response({ bookings: [booking] });
    if (url === '/api/payments/simulate/' + booking.id) return response({ booking: { ...booking, status: 'paid', paymentMode: 'simulated' }, simulated: true, message: 'Payment simulated successfully. No money was charged.' });
    return fallback(url, options);
  });
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Simulate Payment' }));
  expect(await screen.findByRole('status')).toHaveTextContent('No money was charged');
  expect(screen.getByText('Paid (simulated)', { exact: true })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Simulate Payment' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).toHaveAttribute('placeholder', 'Search destinations...');
  expect(fetch).toHaveBeenCalledWith('/api/payments/simulate/booking-1', expect.objectContaining({ method: 'POST', body: undefined }));
  expect(window.location.pathname).toBe('/bookings');
});
