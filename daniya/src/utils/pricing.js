import { EVENT_CONFIG } from '../config/eventConfig';

/**
 * Determine participant category and ticket price based on age
 * Regular registration UI charges the standard regular pass price (₹299),
 * while age <= 20 is communicated through the student discount disclaimer.
 * @param {number|string} age 
 * @returns {{ category: 'STUDENT' | 'ADULT' | null, isStudentAge: boolean, price: number, label: string }}
 */
export function getParticipantCategory(age) {
  const numericAge = parseInt(age, 10);
  
  if (isNaN(numericAge) || numericAge <= 0) {
    return {
      category: null,
      isStudentAge: false,
      price: EVENT_CONFIG.PRICING.ADULT_PRICE,
      label: 'Enter age'
    };
  }

  const isStudentAge = numericAge <= EVENT_CONFIG.PRICING.STUDENT_AGE_MAX;

  return {
    category: isStudentAge ? 'STUDENT' : 'ADULT',
    isStudentAge,
    price: EVENT_CONFIG.PRICING.ADULT_PRICE, // Regular pricing (₹299)
    label: isStudentAge ? 'Student Age (≤ 20 yrs)' : 'Event Pass (> 20 yrs)'
  };
}

/**
 * Calculate full breakdown for a list of participants
 * Standard online registration bills all passes at regular pricing (₹299).
 * Any student concession for age <= 20 is handled directly via Arpith Hawkz.
 * @param {Array<{ id: string, name: string, age: string|number }>} participants 
 */
export function calculatePricingBreakdown(participants = []) {
  const regularPrice = EVENT_CONFIG.PRICING.ADULT_PRICE; // 299
  const totalParticipants = participants.length;
  let studentCount = 0;
  let adultCount = 0;
  let validParticipants = 0;

  participants.forEach(p => {
    const numericAge = parseInt(p.age, 10);
    if (!isNaN(numericAge) && numericAge > 0) {
      validParticipants++;
      if (numericAge <= EVENT_CONFIG.PRICING.STUDENT_AGE_MAX) {
        studentCount++;
      } else {
        adultCount++;
      }
    }
  });

  // Regular pricing applied to all passes in standard web checkout
  const totalAmount = totalParticipants * regularPrice;

  return {
    totalParticipants,
    validParticipants,
    studentCount,
    adultCount,
    regularPrice,
    adultPrice: regularPrice,
    totalAmount,
    currency: EVENT_CONFIG.PRICING.CURRENCY_SYMBOL
  };
}

import { calculateAgeFromDob, formatToIndianDate, parseIndianDate } from './indianDateUtils';
export { calculateAgeFromDob, formatToIndianDate, parseIndianDate };
