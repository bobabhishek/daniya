import { generateMockIdProofSvg } from '../utils/mockIdProof';
import { formatToIndianDate } from '../utils/indianDateUtils';

// Helper to attach realistic age proof data strictly in DD/MM/YYYY format
const withProof = (p, dobStr, docType = 'Aadhaar Card (with DOB)') => {
  const indianDob = formatToIndianDate(dobStr);
  return {
    ...p,
    dob: indianDob,
    idProofType: docType,
    idProofName: `${p.name.toLowerCase().replace(/\s+/g, '_')}_id_proof.jpg`,
    idProofUrl: generateMockIdProofSvg({ name: p.name, dob: indianDob, docType })
  };
};

// Realistic sample registration database for Admin & Organizer view
const RAW_MOCK_REGISTRATIONS = [
  {
    registrationId: "KD-001245",
    dateTime: "02/10/2026, 02:15 PM",
    participantsSummary: "Aarav Sharma, Diya Patel, Kabir Mehta",
    count: 3,
    under20Count: 2,
    above20Count: 1,
    amount: 697, // 2*199 + 1*299
    paymentStatus: "PAID",
    paymentMethod: "UPI (Google Pay)",
    transactionId: "MOCK-TXN-9F82A4B1",
    participants: [
      withProof({ id: "p1", name: "Aarav Sharma", age: 18, category: "STUDENT", price: 199, ticketId: "KD-001245-T01" }, "14-03-2008", "Aadhaar Card (with DOB)"),
      withProof({ id: "p2", name: "Diya Patel", age: 20, category: "STUDENT", price: 199, ticketId: "KD-001245-T02" }, "22-09-2006", "College / School Student ID (with DOB)"),
      withProof({ id: "p3", name: "Kabir Mehta", age: 32, category: "ADULT", price: 299, ticketId: "KD-001245-T03" }, "05-11-1994", "Driving License")
    ]
  },
  {
    registrationId: "KD-001246",
    dateTime: "02/10/2026, 01:42 PM",
    participantsSummary: "Ananya Joshi",
    count: 1,
    under20Count: 1,
    above20Count: 0,
    amount: 199,
    paymentStatus: "PAID",
    paymentMethod: "UPI (PhonePe)",
    transactionId: "MOCK-TXN-3E41B920",
    participants: [
      withProof({ id: "p1", name: "Ananya Joshi", age: 19, category: "STUDENT", price: 199, ticketId: "KD-001246-T01" }, "18-01-2007", "Aadhaar Card (with DOB)")
    ]
  },
  {
    registrationId: "KD-001247",
    dateTime: "02/10/2026, 01:10 PM",
    participantsSummary: "Pranav Desai, Sneha Desai",
    count: 2,
    under20Count: 0,
    above20Count: 2,
    amount: 598, // 2*299
    paymentStatus: "PAID",
    paymentMethod: "HDFC Credit Card",
    transactionId: "MOCK-TXN-8C9134D5",
    participants: [
      withProof({ id: "p1", name: "Pranav Desai", age: 28, category: "ADULT", price: 299, ticketId: "KD-001247-T01" }, "11-06-1998", "Passport"),
      withProof({ id: "p2", name: "Sneha Desai", age: 26, category: "ADULT", price: 299, ticketId: "KD-001247-T02" }, "04-12-2000", "Aadhaar Card (with DOB)")
    ]
  },
  {
    registrationId: "KD-001248",
    dateTime: "02/10/2026, 12:45 PM",
    participantsSummary: "Meera Shah, Yash Shah, Kunal Shah",
    count: 3,
    under20Count: 1,
    above20Count: 2,
    amount: 797, // 1*199 + 2*299
    paymentStatus: "PAID",
    paymentMethod: "UPI (Paytm)",
    transactionId: "MOCK-TXN-4A12F988",
    participants: [
      withProof({ id: "p1", name: "Meera Shah", age: 16, category: "STUDENT", price: 199, ticketId: "KD-001248-T01" }, "29-08-2010", "Aadhaar Card (with DOB)"),
      withProof({ id: "p2", name: "Yash Shah", age: 24, category: "ADULT", price: 299, ticketId: "KD-001248-T02" }, "15-05-2002", "Driving License"),
      withProof({ id: "p3", name: "Kunal Shah", age: 29, category: "ADULT", price: 299, ticketId: "KD-001248-T03" }, "19-10-1997", "Aadhaar Card (with DOB)")
    ]
  },
  {
    registrationId: "KD-001249",
    dateTime: "02/10/2026, 12:18 PM",
    participantsSummary: "Vikram Rathore, Pooja Rathore, Riya Rathore, Dev Rathore, Siddharth Sen",
    count: 5,
    under20Count: 3,
    above20Count: 2,
    amount: 1195, // 3*199 + 2*299 = 597 + 598 = 1195
    paymentStatus: "PAID",
    paymentMethod: "ICICI Net Banking",
    transactionId: "MOCK-TXN-7B298CD1",
    participants: [
      withProof({ id: "p1", name: "Vikram Rathore", age: 34, category: "ADULT", price: 299, ticketId: "KD-001249-T01" }, "10-02-1992", "Aadhaar Card (with DOB)"),
      withProof({ id: "p2", name: "Pooja Rathore", age: 31, category: "ADULT", price: 299, ticketId: "KD-001249-T02" }, "14-07-1995", "Government Photo ID (with DOB)"),
      withProof({ id: "p3", name: "Riya Rathore", age: 15, category: "STUDENT", price: 199, ticketId: "KD-001249-T03" }, "03-04-2011", "Aadhaar Card (with DOB)"),
      withProof({ id: "p4", name: "Dev Rathore", age: 17, category: "STUDENT", price: 199, ticketId: "KD-001249-T04" }, "18-09-2009", "Aadhaar Card (with DOB)"),
      withProof({ id: "p5", name: "Siddharth Sen", age: 19, category: "STUDENT", price: 199, ticketId: "KD-001249-T05" }, "20-02-2007", "College / School Student ID (with DOB)")
    ]
  },
  {
    registrationId: "KD-001250",
    dateTime: "02/10/2026, 11:50 AM",
    participantsSummary: "College Raas Group (10 Participants: Aryan, Tanisha, Neha, Varun, Ritesh, Shreya, Rahul, Bhavin, Mansi, Divya)",
    count: 10,
    under20Count: 6,
    above20Count: 4,
    amount: 2390, // 6*199 + 4*299 = 1194 + 1196 = 2390
    paymentStatus: "PAID",
    paymentMethod: "UPI (Google Pay)",
    transactionId: "MOCK-TXN-1F93A401",
    participants: [
      withProof({ id: "p1", name: "Aryan Varma", age: 19, category: "STUDENT", price: 199, ticketId: "KD-001250-T01" }, "10-10-2007", "Aadhaar Card (with DOB)"),
      withProof({ id: "p2", name: "Tanisha Rao", age: 18, category: "STUDENT", price: 199, ticketId: "KD-001250-T02" }, "08-03-2008", "Aadhaar Card (with DOB)"),
      withProof({ id: "p3", name: "Neha Trivedi", age: 20, category: "STUDENT", price: 199, ticketId: "KD-001250-T03" }, "01-05-2006", "College / School Student ID (with DOB)"),
      withProof({ id: "p4", name: "Varun Malhotra", age: 17, category: "STUDENT", price: 199, ticketId: "KD-001250-T04" }, "12-11-2008", "Aadhaar Card (with DOB)"),
      withProof({ id: "p5", name: "Ritesh Bhatt", age: 20, category: "STUDENT", price: 199, ticketId: "KD-001250-T05" }, "19-09-2006", "Aadhaar Card (with DOB)"),
      withProof({ id: "p6", name: "Shreya Ghoshal", age: 19, category: "STUDENT", price: 199, ticketId: "KD-001250-T06" }, "25-06-2007", "Aadhaar Card (with DOB)"),
      withProof({ id: "p7", name: "Rahul Dave", age: 22, category: "ADULT", price: 299, ticketId: "KD-001250-T07" }, "03-01-2004", "Driving License"),
      withProof({ id: "p8", name: "Bhavin Kapadia", age: 23, category: "ADULT", price: 299, ticketId: "KD-001250-T08" }, "14-08-2003", "Passport"),
      withProof({ id: "p9", name: "Mansi Parekh", age: 25, category: "ADULT", price: 299, ticketId: "KD-001250-T09" }, "29-04-2001", "Aadhaar Card (with DOB)"),
      withProof({ id: "p10", name: "Divya Shah", age: 24, category: "ADULT", price: 299, ticketId: "KD-001250-T10" }, "17-12-2001", "Aadhaar Card (with DOB)")
    ]
  },
  {
    registrationId: "KD-001251",
    dateTime: "02/10/2026, 11:15 AM",
    participantsSummary: "Rajesh Soni",
    count: 1,
    under20Count: 0,
    above20Count: 1,
    amount: 299,
    paymentStatus: "PAID",
    paymentMethod: "UPI (Paytm)",
    transactionId: "MOCK-TXN-55A19CD2",
    participants: [
      withProof({ id: "p1", name: "Rajesh Soni", age: 38, category: "ADULT", price: 299, ticketId: "KD-001251-T01" }, "15-08-1988", "Aadhaar Card (with DOB)")
    ]
  },
  {
    registrationId: "KD-001252",
    dateTime: "02/10/2026, 10:40 AM",
    participantsSummary: "Isha Ambani, Shlok Ambani",
    count: 2,
    under20Count: 1,
    above20Count: 1,
    amount: 498, // 1*199 + 1*299 = 498
    paymentStatus: "PAID",
    paymentMethod: "SBI Net Banking",
    transactionId: "MOCK-TXN-90B763C1",
    participants: [
      withProof({ id: "p1", name: "Isha Ambani", age: 19, category: "STUDENT", price: 199, ticketId: "KD-001252-T01" }, "09-12-2006", "Aadhaar Card (with DOB)"),
      withProof({ id: "p2", name: "Shlok Ambani", age: 22, category: "ADULT", price: 299, ticketId: "KD-001252-T02" }, "18-05-2004", "Driving License")
    ]
  },
  {
    registrationId: "KD-001253",
    dateTime: "02/10/2026, 10:05 AM",
    participantsSummary: "Tanvi Parikh, Harsh Parikh, Nidhi Parikh, Keval Parikh",
    count: 4,
    under20Count: 2,
    above20Count: 2,
    amount: 996, // 2*199 + 2*299 = 398 + 598 = 996
    paymentStatus: "PAID",
    paymentMethod: "Axis Bank Card",
    transactionId: "MOCK-TXN-6D114EA8",
    participants: [
      withProof({ id: "p1", name: "Tanvi Parikh", age: 18, category: "STUDENT", price: 199, ticketId: "KD-001253-T01" }, "05-02-2008", "Aadhaar Card (with DOB)"),
      withProof({ id: "p2", name: "Harsh Parikh", age: 20, category: "STUDENT", price: 199, ticketId: "KD-001253-T02" }, "16-09-2006", "Aadhaar Card (with DOB)"),
      withProof({ id: "p3", name: "Nidhi Parikh", age: 27, category: "ADULT", price: 299, ticketId: "KD-001253-T03" }, "28-03-1999", "Passport"),
      withProof({ id: "p4", name: "Keval Parikh", age: 29, category: "ADULT", price: 299, ticketId: "KD-001253-T04" }, "12-10-1997", "Driving License")
    ]
  },
  {
    registrationId: "KD-001254",
    dateTime: "02/10/2026, 09:30 AM",
    participantsSummary: "Kavya Rawal",
    count: 1,
    under20Count: 1,
    above20Count: 0,
    amount: 199,
    paymentStatus: "PAID",
    paymentMethod: "UPI (Google Pay)",
    transactionId: "MOCK-TXN-22EF8901",
    participants: [
      withProof({ id: "p1", name: "Kavya Rawal", age: 17, category: "STUDENT", price: 199, ticketId: "KD-001254-T01" }, "14-11-2008", "Aadhaar Card (with DOB)")
    ]
  },
  {
    registrationId: "KD-001255",
    dateTime: "02/10/2026, 09:12 AM",
    participantsSummary: "Chirag Barot, Jayesh Barot",
    count: 2,
    under20Count: 0,
    above20Count: 2,
    amount: 598,
    paymentStatus: "PENDING",
    paymentMethod: "UPI (Initiated)",
    transactionId: "MOCK-TXN-PENDING-01",
    participants: [
      withProof({ id: "p1", name: "Chirag Barot", age: 31, category: "ADULT", price: 299, ticketId: "KD-001255-T01" }, "02-06-1995", "Driving License"),
      withProof({ id: "p2", name: "Jayesh Barot", age: 35, category: "ADULT", price: 299, ticketId: "KD-001255-T02" }, "20-01-1991", "Aadhaar Card (with DOB)")
    ]
  },
  {
    registrationId: "KD-001256",
    dateTime: "02/10/2026, 08:45 AM",
    participantsSummary: "Manav Joshi, Preeti Joshi, Darshan Joshi",
    count: 3,
    under20Count: 3,
    above20Count: 0,
    amount: 597, // 3*199
    paymentStatus: "PAID",
    paymentMethod: "UPI (PhonePe)",
    transactionId: "MOCK-TXN-43B09CD1",
    participants: [
      withProof({ id: "p1", name: "Manav Joshi", age: 16, category: "STUDENT", price: 199, ticketId: "KD-001256-T01" }, "22-07-2010", "Aadhaar Card (with DOB)"),
      withProof({ id: "p2", name: "Preeti Joshi", age: 19, category: "STUDENT", price: 199, ticketId: "KD-001256-T02" }, "11-09-2007", "College / School Student ID (with DOB)"),
      withProof({ id: "p3", name: "Darshan Joshi", age: 20, category: "STUDENT", price: 199, ticketId: "KD-001256-T03" }, "03-03-2006", "Aadhaar Card (with DOB)")
    ]
  },
  {
    registrationId: "KD-001257",
    dateTime: "02/10/2026, 08:10 AM",
    participantsSummary: "Suresh Chauhan",
    count: 1,
    under20Count: 0,
    above20Count: 1,
    amount: 299,
    paymentStatus: "FAILED",
    paymentMethod: "Card (Insufficient Balance)",
    transactionId: "MOCK-TXN-FAIL-88",
    participants: [
      withProof({ id: "p1", name: "Suresh Chauhan", age: 41, category: "ADULT", price: 299, ticketId: "KD-001257-T01" }, "18-12-1984", "Aadhaar Card (with DOB)")
    ]
  }
];

export const INITIAL_MOCK_REGISTRATIONS = RAW_MOCK_REGISTRATIONS.map(r => ({
  ...r,
  expectedAmount: r.expectedAmount ?? r.amount,
  enteredAmount: r.enteredAmount ?? r.amount,
  ocrAmount: r.paymentStatus === 'PAID' ? (r.ocrAmount ?? r.amount) : null,
  ocrConfidence: r.paymentStatus === 'PAID' ? 0.98 : null,
  verificationStatus: r.paymentStatus === 'PAID' ? 'VERIFIED' : r.paymentStatus === 'FAILED' ? 'REJECTED' : 'PENDING',
  receiptPath: r.paymentStatus === 'PAID' ? `receipts/${r.registrationId}/payment_receipt.jpg` : null,
  uploadedAt: r.dateTime
}));
