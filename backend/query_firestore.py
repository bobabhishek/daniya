#!/usr/bin/env python3
"""
Direct Firestore Query Tool
View all registrations, payments, tickets, and participants data
"""

import sys
sys.path.insert(0, '.')

from app.firebase import get_db
import json
from datetime import datetime

def query_all_data():
    db = get_db()
    
    print("=" * 80)
    print("FIRESTORE DATABASE QUERY - COMPLETE DATA VIEW")
    print("=" * 80)
    
    # Query Registrations
    print("\n📋 REGISTRATIONS (registrations collection)")
    print("-" * 80)
    registrations = list(db.collection('registrations').stream())
    print(f"Total: {len(registrations)}")
    
    for doc in registrations[:5]:  # Show first 5
        data = doc.to_dict()
        print(f"\n{doc.id}:")
        print(f"  Participants: {[p.get('name') for p in data.get('participants', [])]}")
        print(f"  Expected Amount: ₹{data.get('expected_amount')}")
        print(f"  Verified Amount: ₹{data.get('verified_amount')}")
        print(f"  Payment Status: {data.get('payment_status')}")
        print(f"  Verification Status: {data.get('verification_status')}")
        print(f"  UPI Ref: {data.get('upi_ref')}")
        print(f"  Screenshot Time: {data.get('payment_screenshot_uploaded_time')}")
    
    if len(registrations) > 5:
        print(f"\n... and {len(registrations) - 5} more registrations")
    
    # Query Payments
    print("\n\n💳 PAYMENTS (payments collection)")
    print("-" * 80)
    payments = list(db.collection('payments').stream())
    print(f"Total: {len(payments)}")
    for doc in payments[:3]:
        data = doc.to_dict()
        print(f"\n{doc.id}: {data.get('amount')} - {data.get('status')}")
    
    # Query Tickets
    print("\n\n🎟️  TICKETS (tickets collection)")
    print("-" * 80)
    tickets = list(db.collection('tickets').stream())
    print(f"Total: {len(tickets)}")
    for doc in tickets[:3]:
        data = doc.to_dict()
        print(f"\n{doc.id}: {data.get('participant_name', 'N/A')}")
    
    # Query Participants
    print("\n\n👥 PARTICIPANTS (participants collection)")
    print("-" * 80)
    participants = list(db.collection('participants').stream())
    print(f"Total: {len(participants)}")
    for doc in participants[:3]:
        data = doc.to_dict()
        print(f"\n{doc.id}: {data.get('name', 'N/A')}")
    
    print("\n" + "=" * 80)
    print("END OF QUERY")
    print("=" * 80)

if __name__ == "__main__":
    query_all_data()
