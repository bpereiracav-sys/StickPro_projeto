# Refactoring Guide - server.py

## Current State
- `server.py` has **8036 lines** - critically large
- All routes are in a single file
- High risk of context window issues

## Target Architecture

```
/app/backend/
├── server.py              # Main app, includes routers (< 200 lines)
├── core/
│   ├── __init__.py
│   ├── database.py        # MongoDB connection ✅ CREATED
│   ├── security.py        # JWT, auth utilities ✅ CREATED
│   └── config.py          # App configuration ✅ CREATED
├── models/
│   ├── __init__.py
│   ├── user.py            # User models
│   ├── team.py            # Team models
│   ├── event.py           # Event models
│   ├── championship.py    # Championship models
│   ├── payment.py         # Payment models
│   └── member.py          # Member models
├── routes/
│   ├── __init__.py
│   ├── auth.py            # Lines 1242-1356 ✅ TEMPLATE CREATED
│   ├── users.py           # Lines 1357-1720
│   ├── clubs.py           # Lines 1721-1863
│   ├── subscription.py    # Lines 1864-2058
│   ├── permissions.py     # Lines 2059-2100
│   ├── guardian.py        # Lines 2101-2200
│   ├── teams.py           # Lines 2202-2445
│   ├── members.py         # Lines 2447-3295 (large section)
│   ├── championships.py   # Lines 3300-5000 (largest section)
│   ├── events.py          # Lines 5000-5400
│   ├── convocations.py    # Lines 5295-5380
│   ├── attendance.py      # Lines 5397-5750
│   ├── stats.py           # Lines 5988-6082
│   ├── messages.py        # Lines 6083-6148
│   ├── dashboard.py       # Lines 6149-6260
│   ├── uploads.py         # Lines 6268-6305
│   ├── library.py         # Lines 6306-6400
│   ├── ai.py              # Lines 6402-6505
│   ├── notifications.py   # Lines 6507-6615
│   ├── unavailabilities.py # Lines 6616-6800
│   ├── reminders.py       # Lines 6830-7066
│   └── payments.py        # Lines 7067-8000 (large section)
├── services/
│   ├── __init__.py
│   ├── email.py           # Email sending (Resend)
│   └── scraping.py        # Web scraping for game sheets
└── utils/
    ├── __init__.py
    └── helpers.py         # Shared utility functions
```

## Migration Steps (Priority Order)

### Phase 1: Core Infrastructure ✅ DONE
1. Create `/app/backend/core/` module
2. Extract database connection
3. Extract JWT/security utilities
4. Extract configuration

### Phase 2: Models (Next Priority)
1. Extract Pydantic models to `/app/backend/models/`
2. Ensure imports work across modules

### Phase 3: Routes (Incremental)
For each route file:
1. Create new router with prefix
2. Copy functions to new file
3. Update imports
4. Test endpoints
5. Remove from server.py
6. Include router in main app

### Phase 4: Services & Utils
1. Extract email service
2. Extract scraping utilities
3. Create shared helpers

## Important Notes
- Always test after each migration step
- Keep server.py functional during migration
- Use feature flags if needed
- Don't break existing frontend

## Current Progress
- [x] Core module created
- [x] Auth routes template created
- [ ] Models extraction
- [ ] Full routes migration
