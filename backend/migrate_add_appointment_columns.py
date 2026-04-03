import sqlite3
import os

# Try common locations where the SQLite DB may be located.
possible = [
    os.path.join(os.path.dirname(__file__), 'hospital.db'),
    os.path.join(os.path.dirname(__file__), '..', 'hospital.db'),
    os.path.join(os.path.dirname(__file__), 'instance', 'hospital.db'),
]
DB = None
for p in possible:
    p = os.path.normpath(p)
    if os.path.exists(p):
        DB = p
        break
if not DB:
    print('Database file not found in expected locations:')
    for p in possible:
        print(' -', os.path.normpath(p))
    raise SystemExit(0)
print('Using DB:', DB)

conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute("PRAGMA table_info(appointment)")
cols = [r[1] for r in cur.fetchall()]
print('Existing columns:', cols)
changes = []
if 'payment_status' not in cols:
    cur.execute("ALTER TABLE appointment ADD COLUMN payment_status TEXT DEFAULT 'unpaid'")
    changes.append('payment_status')
if 'payment_amount' not in cols:
    cur.execute("ALTER TABLE appointment ADD COLUMN payment_amount REAL DEFAULT 0")
    changes.append('payment_amount')
if 'payment_method' not in cols:
    cur.execute("ALTER TABLE appointment ADD COLUMN payment_method TEXT")
    changes.append('payment_method')
if changes:
    conn.commit()
    print('Added columns:', changes)
else:
    print('No columns needed')

# show final columns
cur.execute("PRAGMA table_info(appointment)")
cols = [r[1] for r in cur.fetchall()]
print('Final columns:', cols)
conn.close()
