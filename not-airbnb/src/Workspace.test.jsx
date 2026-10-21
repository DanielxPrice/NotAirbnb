import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from './App';
const user = { id: 'guest-1', name: 'Traveler', email: 'guest@example.com', role: 'traveler' };
const property = { id: 'property-1', title: 'Mountain House', location: 'Big Bear', description: 'A retreat', price: 1500, bedrooms: 2, bathrooms: 1, maxGuests: 4, images: ['/sample.jpg'], amenities: [], host: { id: 'host-1', name: 'Host' }, reviews: [], rating: 0 };
const booking = { id: 'booking-1', propertyId: property.id, propertyTitle: property.title, hostId: 'host-1', userId: user.id, checkIn: '2030-01-01', checkOut: '2030-01-03', guests: 2, totalPrice: 3000, status: 'pending' };
const thread = { id: 'thread-1', propertyTitle: property.title, hostId: 'host-1', guestId: user.id, hostName: 'Host', guestName: user.name, blocked: false, blockedByMe: false, messages: [] };
const response = (data, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => data });
let handlers;
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'test-booking-key' } });
  handlers = {};
  global.fetch = jest.fn((url, options = {}) => {
    if (handlers[url]) return handlers[url](options);
    if (url === '/api/auth/me') return response({ user });
    if (url === '/api/listings') return response({ listings: [property] });
    if (url === '/api/bookings') return response({ bookings: [booking] });
    if (url === '/api/threads') return response({ threads: [thread] });
    throw new Error('Unexpected request: ' + url);
  });
});
afterEach(() => jest.restoreAllMocks());
function open(path) { window.history.replaceState({}, '', path); render(<App />); }

test('account saves a display name and shows server failures', async () => {
  handlers['/api/auth/me'] = options => options.method === 'PATCH' ? response({ error: 'Unable to save' }, 503) : response({ user });
  open('/account');
  fireEvent.change(await screen.findByLabelText('Display name'), { target: { value: 'New Name' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  expect(await screen.findByRole('status')).toHaveTextContent('Unable to save');
  expect(screen.getByLabelText('Display name')).toHaveValue('New Name');
});
test('account signs out other sessions without logging out the current user', async () => {
  handlers['/api/auth/sessions/revoke-others'] = () => response({ message: 'Other sessions have been signed out.' });
  open('/account');
  fireEvent.click(await screen.findByRole('button', { name: 'Sign out other sessions' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Other sessions have been signed out');
  expect(screen.getByLabelText('Display name')).toHaveValue('Traveler');
  expect(fetch).toHaveBeenCalledWith('/api/auth/sessions/revoke-others', expect.objectContaining({ method: 'POST' }));
});
test('support preserves input on throttling and clears it only after successful submission', async () => {
  let succeeds = false;
  handlers['/api/support'] = () => succeeds ? response({ id: 'ticket-123', message: 'Saved.' }) : response({ error: 'Too many attempts. Please wait.' }, 429);
  open('/support?subject=Report%20conversation%20thread-1');
  expect(await screen.findByLabelText('Subject')).toHaveValue('Report conversation thread-1');
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Repeated unwanted messages.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Too many attempts');
  expect(screen.getByLabelText('Message')).toHaveValue('Repeated unwanted messages.');
  succeeds = true;
  fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ticket-123'));
  expect(screen.getByLabelText('Message')).toHaveValue('');
});
test('booking filters explain empty results and cancellation reaches the correct API', async () => {
  handlers['/api/bookings/booking-1'] = () => response({ booking: { ...booking, status: 'cancelled' } });
  open('/bookings');
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel Request' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/bookings/booking-1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) })));
  fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'paid' } });
  expect(screen.getByText('No bookings in this view')).toBeInTheDocument();
});
test('host controls are not shown to a traveler and booking errors are recoverable', async () => {
  handlers['/api/bookings/booking-1'] = () => response({ error: 'Booking changed. Refresh.' }, 409);
  open('/bookings');
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel Request' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Booking changed');
  expect(screen.queryByRole('button', { name: 'Accept', exact: true })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel Request' })).toBeEnabled();
});
test('host sees accept and deny controls but cannot pay for a guest', async () => {
  handlers['/api/auth/me'] = () => response({ user: { ...user, id: 'host-1', role: 'host' } });
  open('/bookings');
  expect(await screen.findByRole('button', { name: 'Accept', exact: true })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Deny' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Simulate Payment' })).not.toBeInTheDocument();
});
test('messaging blocks a conversation and disables sending', async () => {
  handlers['/api/threads/thread-1/block'] = () => response({ blocked: true, blockedByMe: true });
  open('/chat?thread=thread-1');
  fireEvent.click(await screen.findByRole('button', { name: 'Block conversation' }));
  expect(await screen.findByRole('button', { name: 'Unblock conversation' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Message', exact: true })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  expect(screen.getByRole('link', { name: 'Report a concern' })).toHaveAttribute('href', '/support?subject=Report%20conversation%20thread-1');
});
test('messages render hostile markup as text and preserve drafts on send failure', async () => {
  const malicious = '<img src=x onerror=alert(1)>';
  handlers['/api/threads'] = () => response({ threads: [{ ...thread, messages: [{ id: 'm1', senderId: 'host-1', text: malicious, timestamp: '2030-01-01T00:00:00Z' }] }] });
  handlers['/api/threads/thread-1/messages'] = () => response({ error: 'Conversation blocked' }, 404);
  open('/chat?thread=thread-1');
  const input = await screen.findByRole('textbox', { name: 'Message', exact: true });
  expect(screen.getAllByText(malicious).length).toBeGreaterThan(0);
  expect(document.querySelector('img[src="x"]')).toBeNull();
  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Conversation blocked');
  expect(input).toHaveValue('Hello');
});
test('changing conversations clears the draft to prevent sending it to another host', async () => {
  handlers['/api/threads'] = () => response({ threads: [thread, { ...thread, id: 'thread-2', propertyTitle: 'Other House' }] });
  open('/chat?thread=thread-1');
  fireEvent.change(await screen.findByRole('textbox', { name: 'Message', exact: true }), { target: { value: 'Private draft' } });
  fireEvent.click(screen.getByRole('button', { name: /Other House/ }));
  expect(screen.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('');
});
test('search includes expensive properties by default and clearing the maximum restores them', async () => {
  open('/search');
  await screen.findByRole('heading', { name: 'Mountain House' });
  fireEvent.change(screen.getByLabelText('Maximum price'), { target: { value: '1000' } });
  expect(screen.queryByRole('heading', { name: 'Mountain House' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Maximum price'), { target: { value: '' } });
  expect(screen.getByRole('heading', { name: 'Mountain House' })).toBeInTheDocument();
});
test('property reviews visibly distinguish fictional samples from genuine reviews', async () => {
  handlers['/api/listings'] = () => response({ listings: [{ ...property, rating: 4, reviews: [{ id: 'r1', userName: 'Demo guest', rating: 4, comment: 'Fictional sample', isDemo: true }] }] });
  open('/listing/property-1');
  expect(await screen.findByText('Demo review')).toBeInTheDocument();
  expect(screen.getByText('Fictional sample')).toBeInTheDocument();
});
test('workspace navigation exposes the current page accessibly', async () => {
  open('/account');
  const nav = await screen.findByRole('navigation', { name: 'Your workspace' });
  expect(within(nav).getByRole('link', { name: 'Workspace: Account' })).toHaveAttribute('aria-current', 'page');
});
