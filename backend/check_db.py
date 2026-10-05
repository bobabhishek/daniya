from app.firebase import get_db

db = get_db()

# Query all collections
print('=' * 80)
print('FIRESTORE DATABASE CONTENT')
print('=' * 80)

# Count all registrations
registrations = list(db.collection('registrations').stream())
print(f'\n✓ REGISTRATIONS: {len(registrations)} total')

if registrations:
    data = registrations[0].to_dict()
    print(f'\n   Sample (First Registration):')
    print(f'   ID: {registrations[0].id}')
    if data.get('participants'):
        print(f'   Participant: {data["participants"][0].get("name", "N/A")}')
        print(f'   Price: ₹{data["participants"][0].get("price", 0)}')

# Count all other collections
payments = list(db.collection('payments').stream())
print(f'\n✓ PAYMENTS: {len(payments)} total')

tickets = list(db.collection('tickets').stream())
print(f'\n✓ TICKETS: {len(tickets)} total')

participants = list(db.collection('participants').stream())
print(f'\n✓ PARTICIPANTS: {len(participants)} total')

print('\n' + '=' * 80)
print('WHERE DATA IS STORED:')
print('  • Local Database: backend/data/local_firestore_db.json')
print('  • Collections: registrations, payments, tickets, participants')
print('=' * 80)
