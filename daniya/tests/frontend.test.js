import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_EMAIL, ROLES, isAdminUser, getUserRole } from '../src/utils/authRoles.js';
import { EVENT_CONFIG } from '../src/config/eventConfig.js';
import { mergeRegistrationsWithTickets } from '../src/utils/mergePassRecords.js';

describe('Auth Roles & Authorization Contract', () => {
  test('Admin email is strictly teamredhawkz@gmail.com', () => {
    assert.equal(ADMIN_EMAIL, 'teamredhawkz@gmail.com');
  });

  test('isAdminUser correctly verifies admin email and rejects non-admin', () => {
    assert.equal(isAdminUser({ email: 'teamredhawkz@gmail.com' }), true);
    assert.equal(isAdminUser({ email: 'TEAMREDHAWKZ@GMAIL.COM' }), true);
    assert.equal(isAdminUser({ email: 'attendee@gmail.com' }), false);
    assert.equal(isAdminUser(null), false);
    assert.equal(isAdminUser({}), false);
  });

  test('getUserRole maps roles deterministically', () => {
    assert.equal(getUserRole({ email: 'teamredhawkz@gmail.com' }), ROLES.ADMIN);
    assert.equal(getUserRole({ email: 'attendee@gmail.com' }), ROLES.ATTENDEE);
    assert.equal(getUserRole(null), ROLES.GUEST);
  });

  test('ROLES defines ADMIN, ATTENDEE, and GUEST', () => {
    assert.equal(ROLES.ADMIN, 'ADMIN');
    assert.equal(ROLES.ATTENDEE, 'ATTENDEE');
    assert.equal(ROLES.GUEST, 'GUEST');
  });
});

describe('Event Configuration & Pricing Constants', () => {
  test('Event metadata is configured accurately', () => {
    assert.equal(EVENT_CONFIG.EVENT_NAME, 'Taal Pe Nacho Re');
    assert.equal(EVENT_CONFIG.PRICING.ADULT_PRICE, 299);
    assert.equal(EVENT_CONFIG.PRICING.STUDENT_PRICE, 199);
    assert.equal(EVENT_CONFIG.PRICING.STUDENT_AGE_MAX, 20);
  });
});

describe('Attendee Passes Data Merging', () => {
  test('mergeRegistrationsWithTickets properly associates tickets with verified registrations', () => {
    const mockRegistrations = [
      {
        registrationId: 'KD-000001',
        paymentStatus: 'PAID',
        verificationStatus: 'VERIFIED',
        ticketIds: ['KD-000001-T01'],
        participants: [{ name: 'Participant 1', dob: '01/01/2000' }]
      }
    ];

    const mockTickets = [
      {
        ticketId: 'KD-000001-T01',
        registrationId: 'KD-000001',
        name: 'Participant 1',
        paymentStatus: 'PAID'
      }
    ];

    const merged = mergeRegistrationsWithTickets(mockRegistrations, mockTickets);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].registrationId, 'KD-000001');
    assert.equal(merged[0].participants[0].ticketId, 'KD-000001-T01');
  });

  test('mergeRegistrationsWithTickets strictly filters unverified pending registrations', () => {
    const mockRegistrations = [
      {
        registrationId: 'KD-000002',
        paymentStatus: 'PENDING',
        verificationStatus: 'PENDING',
        participants: [{ name: 'Pending User', dob: '01/01/2000' }]
      }
    ];

    const merged = mergeRegistrationsWithTickets(mockRegistrations, []);
    assert.equal(merged.length, 0, 'Pending unverified registrations should not appear as valid passes');
  });

  test('mergeRegistrationsWithTickets includes verified bookings even if ticket query is lagging', () => {
    const mockRegistrations = [
      {
        registrationId: 'KD-000003',
        paymentStatus: 'PAID',
        verificationStatus: 'VERIFIED',
        ticketIds: ['KD-000003-T01'],
        participants: [{ name: 'Verified User', dob: '01/01/2000', ticketId: 'KD-000003-T01' }]
      }
    ];

    const merged = mergeRegistrationsWithTickets(mockRegistrations, []);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].registrationId, 'KD-000003');
  });
});
