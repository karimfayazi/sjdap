# SJDAP Application

This application contains:
- **Login Page** - User authentication
- **Master Layout** - Root layout with footer
- **Dashboard** - Complete dashboard with all features

## Structure

```
src/
├── app/
│   ├── layout.tsx          # Master layout (root)
│   ├── page.tsx            # Home page
│   ├── login/              # Login page
│   ├── dashboard/          # Dashboard pages
│   └── api/
│       └── login/          # Login API
├── components/             # React components
├── hooks/                  # Custom React hooks
└── lib/                    # Utility libraries
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Features Included

- ✅ Login page with authentication
- ✅ Dashboard with sidebar navigation
- ✅ All dashboard pages and features
- ✅ API routes for login
- ✅ Components (Navbar, Sidebar, etc.)
- ✅ Authentication hooks
- ✅ Database connection utilities

## Notes

- Database configuration is in `src/lib/db.ts`
- Authentication logic is in `src/hooks/useAuth.ts`
- All dashboard features are included

