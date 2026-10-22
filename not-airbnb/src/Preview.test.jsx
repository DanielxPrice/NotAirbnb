import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { api } from './api';
beforeEach(() => {
  window.history.replaceState({}, '', '/preview/traveler/search');
  global.fetch = jest.fn(() => { throw new Error('Preview must not use the backend'); });
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'preview-test-key' } });
});
afterEach(() => jest.restoreAllMocks());
function open(path) { window.history.replaceState({}, '', path); render(<App />); }
test('preview renders searchable sample listings without restoring a real session', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Coastal Weekend Villa' })).toBeInTheDocument();
  expect(screen.getByRole('complementary', { name: 'Preview mode' })).toHaveTextContent('Preview only');
  fireEvent.change(screen.getByLabelText('Maximum price'), { target: { value: '150' } });
  expect(screen.queryByRole('heading', { name: 'Coastal Weekend Villa' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'City Garden Apartment' })).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
test.each([
  ['/preview/traveler/bookings', 'Simulate Payment'],
  ['/preview/traveler/account', 'Save'],
  ['/preview/traveler/account', 'Sign out other sessions'],
  ['/preview/traveler/support', 'Send Request'],
  ['/preview/traveler/cart', 'Submit Booking Requests'],
  ['/preview/traveler/listing/preview-property-0', 'Book Now'],
  ['/preview/host/bookings', 'Accept']
])('preview disables %s action %s', async (path, action) => {
  open(path);
  const button = await screen.findByRole('button', { name: action, exact: true });
  expect(button).toBeDisabled(); fireEvent.click(button);
  expect(fetch).not.toHaveBeenCalled();
});
test('preview conversations can be opened but messages and blocking are disabled', async () => {
  open('/preview/traveler/chat');
  fireEvent.click(await screen.findByRole('button', { name: /Coastal Weekend Villa/ }));
  expect(screen.getByRole('textbox', { name: 'Message', exact: true })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Block conversation' })).toBeDisabled();
  expect(fetch).not.toHaveBeenCalled();
});
test('host preview shows listing editor without permitting uploads or publishing', async () => {
  open('/preview/host/listings');
  fireEvent.click(await screen.findByRole('button', { name: 'Add New Listing' }));
  expect(screen.getByLabelText(/Property photos/)).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Add Listing', exact: true })).toBeDisabled();
  expect(screen.getAllByRole('button', { name: 'Archive' }).every(b => b.disabled)).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
test('API blocks all mutations and unknown reads even when called directly', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    await expect(api('/support', { method, body: { message: 'Never send' } })).rejects.toMatchObject({ status: 403 });
  }
  await expect(api('/private-records')).rejects.toMatchObject({ status: 403 });
  const first = await api('/listings'); first.listings[0].title = 'Changed';
  expect((await api('/listings')).listings[0].title).toBe('Coastal Weekend Villa');
  expect(fetch).not.toHaveBeenCalled();
});
test('preview login URL does not expose a functional registration or login form', async () => {
  open('/preview/traveler/login');
  await screen.findByRole('heading', { name: 'Coastal Weekend Villa' });
  expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
