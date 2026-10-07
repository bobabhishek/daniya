// Central Event Configuration
// IMPORTANT: Event name is configurable here and not hardcoded across the codebase.
export const EVENT_CONFIG = {
  // Configurable Event Identity
  EVENT_NAME: "Taal Pe Nacho Re", // Configurable: Can be changed to any event name like "Dandiya Raas 2026"
  EVENT_EDITION: "Garba & Dandiya Night 2026",
  EVENT_ORGANIZER: "Red Hawks School of Dance",
  EVENT_TAGLINE: "An evening of music, dance and celebration.",
  EVENT_DESCRIPTION: "Immerse yourself in the grandest Navratri celebration with energetic beats of live traditional dhol, mesmerizing Gujarati folk music, vibrant ethnic attire, celebrity performances, and delicious food stalls. Experience the rhythmic clatter of Dandiya and the graceful swirls of Garba!",

  // Event Schedule & Location
  DATE: "10th October 2026",
  DAY: "Saturday",
  TIME: "5:00 PM Onwards",
  VENUE: "Hotel Prakash",
  LOCATION: "Market Lane, Ananthashayana Road, near Anantha Shayan Temple, Karkala, Karnataka 574104",
  MAP_LINK: "https://share.google/xBGfwvKmnYkSyyjlt",

  // Non-Negotiable Pricing Tiers
  PRICING: {
    STUDENT_AGE_MAX: 20,
    STUDENT_PRICE: 199,
    STUDENT_LABEL: "Student Pass (≤ 20 yrs)",
    
    ADULT_PRICE: 299,
    ADULT_LABEL: "Adult Pass (> 20 yrs)",
    
    CURRENCY_SYMBOL: "₹"
  },

  // Assets
  ASSETS: {
    LOGO: "/assets/event_logo.png",
    TICKET_REF_STUDENT: "/assets/ticket_ref_student.png",
    TICKET_REF_ADULT: "/assets/ticket_ref_adult.png",
    ADMIN_UPI_QR: "/assets/admin_qr_arpith.jpg"
  },

  // Official Admin UPI Payment Configuration (Exclusive QR Payment)
  PAYMENT: {
    PAYEE_NAME: "ARPITH MANOHAR",
    ORGANIZER: "Red Hawks",
    UPI_QR_IMAGE: "/assets/admin_qr_arpith.jpg",
    ACCEPTED_APPS: ["Google Pay", "PhonePe", "Paytm", "BHIM", "Cred", "Any Banking UPI"]
  },

  // Important Rules for Attendees
  RULES: [
    {
      id: "01",
      title: "Registration is required for entry.",
      detail: "All attendees must have a valid pre-booked registration confirmation. On-spot registrations are strictly subject to venue capacity."
    },
    {
      id: "02",
      title: "Each participant requires an individual ticket.",
      detail: "Every attendee, regardless of whether they registered individually or as part of a group, receives their own unique ticket pass with individual entry QR code."
    },
    {
      id: "03",
      title: "Student Discount Available (Age ≤ 20).",
      detail: "For age 20 or below, please contact Arpith Hawkz to avail the student discount. Standard entry passes are ₹299 per person. Valid age proof (Student ID / Aadhaar / Gov ID) must be presented at the venue entrance."
    },
    {
      id: "04",
      title: "Tickets are generated after successful payment.",
      detail: "Upon simulated or real payment completion, personalized entry passes with distinct security IDs are generated immediately on screen and available for instant download."
    },
    {
      id: "05",
      title: "Keep the digital ticket/pass available for entry.",
      detail: "Save your PDF ticket or show the digital pass on your smartphone at the entry gates for barcode/QR scanner verification."
    },
    {
      id: "06",
      title: "Follow organizer and venue instructions.",
      detail: "Traditional festive attire is encouraged. Dandiya sticks will be available at the venue stalls. Please adhere to security protocols and venue conduct guidelines."
    }
  ]
};
