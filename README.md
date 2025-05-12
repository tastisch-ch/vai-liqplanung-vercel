# VAI Liquiditätsplanung - Next.js Version

This project is a migration of the VAI Liquiditätsplanung application from Streamlit to Next.js for deployment on Vercel.

## Project Structure

```
/
├── app/                   # Next.js App Router structure
│   ├── api/               # Backend API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── buchungen/     # Bookings endpoints
│   │   ├── fixkosten/     # Fixed costs endpoints
│   │   ├── mitarbeiter/   # Employee endpoints
│   │   └── simulation/    # Simulation endpoints
│   ├── login/             # Login page
│   ├── dashboard/         # Main dashboard
│   ├── fixkosten/         # Fixed costs management
│   ├── mitarbeiter/       # Employee management
│   ├── planung/           # Planning features
│   └── analyse/           # Analysis features
├── components/            # Reusable React components
│   ├── layout/            # Layout components
│   ├── charts/            # Chart components
│   ├── tables/            # Table components
│   ├── forms/             # Form components
│   └── ui/                # UI components
├── lib/                   # Utility functions and shared logic
│   ├── supabase/          # Supabase client and helpers
│   ├── auth/              # Authentication utilities
│   ├── date-utils/        # Date handling utilities
│   ├── currency/          # Currency formatting (CHF)
│   └── data-import/       # Data import utilities
├── models/                # TypeScript interfaces and types
├── public/                # Static assets
│   └── assets/            # Images, icons, etc.
└── supabase/              # Supabase configuration and migrations
    ├── migrations/        # Database migrations
    └── functions/         # Edge functions
```

## Features

- **Authentication**: User login with role-based access (admin/user/read-only)
- **Data Import**: Import data from E-Banking and Excel files
- **Financial Planning**: Visualize upcoming expenses and income
- **Fixed Costs Management**: Manage recurring costs
- **Employee Management**: Handle employee salaries and expenses
- **Financial Analysis**: Analyze financial data with charts and reports
- **Simulation**: Run financial simulations for future planning

## Technology Stack

- **Framework**: Next.js with App Router
- **Backend**: Supabase (Auth, Database)
- **State Management**: React Context API
- **Styling**: Tailwind CSS
- **Charts**: ECharts
- **Tables**: TanStack Table
- **Forms**: React Hook Form with Zod validation

## Getting Started

First, set up the environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Setup

### Prerequisites

- Supabase CLI installed: `brew install supabase/tap/supabase`
- A Supabase project created at [supabase.com](https://supabase.com)

### Setting Up the Database

1. Navigate to the scripts directory and run the setup helper:

```bash
cd scripts
./setup-supabase.sh
```

This script will guide you through the process of:
- Linking your local project to your Supabase instance
- Applying all database migrations
- Optionally seeding your database with test data

### Database Structure

The application uses the following tables:

1. `profiles`: User profile information linked to auth.users
2. `user_settings`: User-specific settings like initial balance and theme colors
3. `buchungen`: Financial transactions
4. `fixkosten`: Recurring fixed costs
5. `mitarbeiter`: Employee information
6. `lohndaten`: Salary data for employees
7. `simulationen`: Financial simulation data
8. `scenarios`: Saved simulation scenarios for what-if analysis

All tables have Row Level Security (RLS) policies to ensure users can only access their own data.

For more detailed information about the database setup, see [supabase/README.md](./supabase/README.md).

## Deployment

This application is designed to be deployed on Vercel:

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy!

For Supabase deployment:

1. Set up your database using the instructions above
2. Make sure your Supabase URL and anon key are added to Vercel environment variables
