from app.firebase import get_db

db = get_db()
regs = len(list(db.collection('registrations').stream()))
tickets = len(list(db.collection('tickets').stream()))

print(f'✅ FRESH START - Database Status:')
print(f'   Registrations: {regs}')
print(f'   Tickets: {tickets}')

if regs == 0 and tickets == 0:
    print('\n✨ Database is CLEAN and READY for new data!')
else:
    print(f'\n⚠️  Database still has old data - may need to restart backend server')
