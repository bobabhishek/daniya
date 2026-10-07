import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_EMAIL, ROLES, isAdminUser, getUserRole } from '../src/utils/authRoles.js';
import { EVENT_CONFIG } from '../src/config/eventConfig.js';
import { mergeRegistrationsWithTickets } from '../src/utils/mergePassRecords.js';
import { cleanIndianPhone, isValidIndianPhone, formatIndianPhone } from '../src/utils/phoneUtils.js';
import { saveStoredPasses, getStoredPasses, clearStoredPasses } from '../src/utils/passCache.js';
import { getParticipantPhoneNumbers, formatParticipantPhoneNumbers } from '../src/utils/adminTable.js';
import { isSessionExpired, SESSION_TIMEOUT_MS, getCachedSession } from '../src/utils/sessionCache.js';
import { validateReceiptUpload } from '../src/utils/receiptValidation.js';

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

  test('mergeRegistrationsWithTickets sorts alphanumeric participant IDs ("p1", "p2") in correct order', () => {
    const mockRegistrations = [
      {
        registrationId: 'KD-000004',
        paymentStatus: 'PAID',
        verificationStatus: 'VERIFIED',
        participants: [
          { participantId: 'p2', name: 'Second Person', dob: '01/01/2000' },
          { participantId: 'p1', name: 'First Person', dob: '01/01/2000' }
        ]
      }
    ];

    const merged = mergeRegistrationsWithTickets(mockRegistrations, []);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].participants[0].name, 'First Person');
    assert.equal(merged[0].participants[1].name, 'Second Person');
    assert.equal(merged[0].participants[0].participantNumber, 1);
    assert.equal(merged[0].participants[1].participantNumber, 2);
  });
});

describe('Attendee Pass Storage Hygiene', () => {
  test('clearStoredPasses removes stale tickets after backend returns no live passes', () => {
    const previousWindow = globalThis.window;
    const previousStorage = globalThis.localStorage;
    const fakeLocalStorage = {
      store: {},
      setItem(key, value) { this.store[key] = String(value); },
      getItem(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; },
      removeItem(key) { delete this.store[key]; },
      clear() { this.store = {}; },
      key(index) { return Object.keys(this.store)[index] ?? null; },
      get length() { return Object.keys(this.store).length; }
    };

    globalThis.window = { localStorage: fakeLocalStorage };
    globalThis.localStorage = fakeLocalStorage;

    try {
      saveStoredPasses('uid-123', 'user@example.com', [{ registrationId: 'KD-OLD-001' }]);
      assert.equal(getStoredPasses('uid-123', 'user@example.com').length, 1);

      clearStoredPasses('uid-123', 'user@example.com');
      assert.deepEqual(getStoredPasses('uid-123', 'user@example.com'), []);
    } finally {
      globalThis.window = previousWindow;
      globalThis.localStorage = previousStorage;
    }
  });
});

describe('Admin Dashboard Phone Extraction', () => {
  test('extracts and formats participant phone numbers for the admin table', () => {
    const participants = [
      { name: 'Disha', phoneNumber: '9876543210' },
      { name: 'Rohan', phone: '+91 9123456789' },
      { name: 'Asha', phoneNumber: '9876543210' }
    ];

    assert.deepEqual(getParticipantPhoneNumbers(participants), ['9876543210', '9123456789']);
    assert.equal(formatParticipantPhoneNumbers(participants), '+91 9876543210, +91 9123456789');
  });
});

describe('Session Timeout Protection', () => {
  test('expired sessions are rejected and stale cached auth is cleared', () => {
    const previousWindow = globalThis.window;
    const previousStorage = globalThis.localStorage;
    const fakeLocalStorage = {
      store: {},
      setItem(key, value) { this.store[key] = String(value); },
      getItem(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; },
      removeItem(key) { delete this.store[key]; },
      clear() { this.store = {}; },
      key(index) { return Object.keys(this.store)[index] ?? null; },
      get length() { return Object.keys(this.store).length; }
    };

    globalThis.window = { localStorage: fakeLocalStorage };
    globalThis.localStorage = fakeLocalStorage;

    try {
      const expiredSession = {
        uid: 'uid-1',
        email: 'user@example.com',
        displayName: 'User',
        lastActiveAt: Date.now() - SESSION_TIMEOUT_MS - 1
      };

      fakeLocalStorage.setItem('daniya_auth_session', JSON.stringify(expiredSession));
      assert.equal(isSessionExpired(expiredSession), true);
      assert.equal(getCachedSession(), null);
      assert.equal(fakeLocalStorage.getItem('daniya_auth_session'), null);
    } finally {
      globalThis.window = previousWindow;
      globalThis.localStorage = previousStorage;
    }
  });
});

describe('Receipt Upload Protection', () => {
  test('accepts valid image screenshots and rejects unsupported or oversized uploads', () => {
    const validFile = { type: 'image/png', size: 2 * 1024 * 1024 };
    assert.deepEqual(validateReceiptUpload(validFile), { valid: true, error: '' });

    const invalidType = { type: 'application/pdf', size: 2 * 1024 * 1024 };
    assert.deepEqual(validateReceiptUpload(invalidType), {
      valid: false,
      error: 'Please select a valid image file (PNG, JPG, JPEG, or WebP).'
    });

    const oversized = { type: 'image/jpeg', size: 25 * 1024 * 1024 };
    assert.deepEqual(validateReceiptUpload(oversized), {
      valid: false,
      error: 'File size exceeds 15 MB. Please upload a compressed screenshot.'
    });
  });
});

describe('Indian Phone Number Validation & Formatting', () => {
  test('isValidIndianPhone accepts valid 10-digit Indian mobile numbers (starts with 6, 7, 8, 9)', () => {
    assert.equal(isValidIndianPhone('9876543210'), true);
    assert.equal(isValidIndianPhone('8123456789'), true);
    assert.equal(isValidIndianPhone('7012345678'), true);
    assert.equal(isValidIndianPhone('6234567890'), true);
  });

  test('isValidIndianPhone accepts numbers with +91 or leading 0 prefix and whitespace/hyphens', () => {
    assert.equal(isValidIndianPhone('+91 98765 43210'), true);
    assert.equal(isValidIndianPhone('+91-9876543210'), true);
    assert.equal(isValidIndianPhone('09876543210'), true);
    assert.equal(isValidIndianPhone('919876543210'), true);
  });

  test('isValidIndianPhone rejects invalid, short, non-mobile, or empty numbers', () => {
    assert.equal(isValidIndianPhone(''), false);
    assert.equal(isValidIndianPhone(null), false);
    assert.equal(isValidIndianPhone('12345'), false); // too short
    assert.equal(isValidIndianPhone('5555555555'), false); // starts with 5 (not Indian mobile)
    assert.equal(isValidIndianPhone('abcdefghij'), false); // non-digits
    assert.equal(isValidIndianPhone('0123456789'), false); // invalid leading digit
  });

  test('cleanIndianPhone extracts clean 10-digit representation', () => {
    assert.equal(cleanIndianPhone('+91 98765 43210'), '9876543210');
    assert.equal(cleanIndianPhone('09876543210'), '9876543210');
    assert.equal(cleanIndianPhone('9876-543-210'), '9876543210');
    assert.equal(cleanIndianPhone(''), '');
  });

  test('formatIndianPhone formats clean 10-digit mobile number with +91', () => {
    assert.equal(formatIndianPhone('9876543210'), '+91 98765 43210');
    assert.equal(formatIndianPhone('+91 9876543210'), '+91 98765 43210');
    assert.equal(formatIndianPhone(''), '');
  });
});
