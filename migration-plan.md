# VAI-Liq-Planung Migration Plan

## Overview
This document outlines the step-by-step plan to migrate the VAI-Liq-Planung application from Python/Streamlit to Next.js 15 with Supabase authentication.

## Technology Stack
- **Frontend**: Next.js 15, React
- **UI Framework**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Charts**: ECharts

## Migration Phases

### Phase 1: Project Setup and Authentication ✅
1. Set up a new Next.js 15 project with App Router
2. Configure Supabase authentication
3. Create AuthProvider component with proper error handling
4. Implement ClientOnly wrapper to prevent hydration issues
5. Create separate layouts for authenticated and public routes
6. Develop navigation components (PublicNav, AuthNav, ConditionalNav)
7. Set up middleware for route protection

### Phase 2: Core Data Model & Services ✅
1. Create TypeScript interfaces for all data models
   - Transactions (Buchungen)
   - Fixed Costs (Fixkosten)
   - Employees (Mitarbeiter)
   - Simulations
   - User profiles
2. Set up Supabase client services for each data model
3. Create utility functions for:
   - Currency formatting
   - Date parsing/formatting
   - Balance calculations
   - Category identification

### Phase 2.5: Error Logging & Debugging ✅
1. Implement comprehensive logging utility
2. Create debugging panel for development
3. Add log export functionality for testing
4. Set up error boundary components 
5. Implement centralized error handling

### Phase 3: Dashboard & Basic Layout ✅
1. Create dashboard landing page with financial summary cards
2. Implement account settings component in sidebar
3. Create starting balance display and input component
4. Implement responsive layout with sidebar
5. Set up navigation between key sections
6. Add quick access links to important features
7. Create transaction overview on dashboard

### Phase 4: Financial Planning (Planung) Module ✅
1. Create monthly/quarterly/yearly planning tabs
2. Implement date range filtering
3. Develop transaction table with color coding for transaction types:
   - Green background for income entries
   - Red background for expense entries
4. Implement transaction type markers:
   - 📌 Fixed costs
   - 🔮 Simulations
   - 💰 Salary payments
   - ✏️ Manually edited entries
5. Create running balance calculation
6. Implement search and filter options
7. Add sorting functionality

### Phase 5: Fixed Costs (Fixkosten) Module ✅
1. Create fixed costs form component
2. Implement CRUD operations for fixed expenses
3. Develop recurring cost management interface
4. Create start/end date settings
5. Implement active/inactive filtering
6. Add monthly cost calculation summary
7. Develop expandable items for detailed view

### Phase 6: Employee Management (Mitarbeiter) Module ✅
1. Create employee data form
2. Implement salary history tracking interface
3. Develop automatic salary payments calculation
4. Create start/end date management for employment periods
5. Implement salary updates and versioning
6. Add expandable employee cards with history

### Phase 7: Transaction Editor Module ✅
1. Create editable transaction table
2. Implement validation for edited fields
3. Add date pickers and dropdowns for edit options
4. Create visual indicators for edited transactions
5. Implement audit trail for changes
6. Add filtering for edited entries

### Phase 8: Analysis (Analyse) Module ✅
1. Implement ECharts integration
2. Create monthly overview chart component
3. Develop cash flow analysis visualization
4. Implement customizable date ranges for charts
5. Create toggle options for different data categories
6. Add trend visualization

### Phase 9: Simulation Tool (In Progress)
1. Create what-if scenario interface
2. Implement future cash flow simulation
3. Develop integration with main financial planning
4. Add scenario comparison visualization

### Phase 9.5: Supabase Integration
1. **Consolidate Application Structure**
   - Organize all protected routes under `app/(authenticated)/` route group
   - Create clear separation between authenticated and public routes
   - Ensure no duplicate routes or components exist

2. **Data Layer Architecture**
   - Implement clean architecture pattern with:
     - `lib/supabase/server.ts` - Server-side Supabase client
     - `lib/supabase/client.ts` - Client-side Supabase client 
     - `lib/types/supabase.ts` - Generated TypeScript types
     - `lib/data/server-data.ts` - Server-side data fetching functions
     - `lib/actions/supabase-actions.ts` - Server actions for mutations
     - `lib/hooks/use-supabase-data.ts` - Client-side React hooks

3. **Database Synchronization**
   - Ensure database migrations are clean and can be applied reliably
   - Implement proper RLS policies for all tables
   - Create TypeScript type definitions for all database tables

4. **Component Pattern Implementation**
   - For each module (transaktionen, fixkosten, etc.):
     - Use server components for initial data fetching
     - Implement client components for interactive UI elements
     - Add mutations via server actions
     - Create optimistic UI updates where appropriate

5. **Authentication Flow Improvements**
   - Enhance login/register experience
   - Implement proper session handling
   - Add password reset functionality
   - Create profile management interface

6. **Real-time Data Updates**
   - Implement Supabase realtime subscriptions where needed
   - Add optimistic UI updates for better UX

### Phase 10: Data Import/Export
1. Create CSV import functionality
2. Implement data validation for imports
3. Develop export options for reports and data
4. Add PDF generation for reports

### Phase 11: Admin Panel
1. Create user management interface
2. Implement role assignment
3. Develop system settings configuration
4. Add access control management

### Phase 12: Optimization & Polishing
1. Implement error handling and fallbacks
2. Add loading states for all data operations
3. Optimize performance for large datasets
4. Conduct cross-browser testing
5. Implement responsive design improvements
6. Add progressive enhancement features
7. Enhance edit UI with modal dialogs for all modules
   - Convert inline editing to modal dialogs (as implemented in Fixkosten module)
   - Standardize dialog appearance and behavior across all modules
   - Add keyboard shortcuts for common editing actions
   - Implement focus management for better accessibility

## Implementation Strategy

### Component Structure
- Create reusable components for common elements
- Use atomic design principles
- Separate logic from presentation

### State Management
- Use React context for global state
- Implement React Query for server state
- Use local state for component-specific data

### Styling Approach
- Use Tailwind CSS for consistent styling
- Create custom utility classes for financial elements
- Implement responsive design patterns

### Data Fetching Strategy
- Implement server actions for data mutations
- Use SWR or React Query for client-side data fetching
- Create API routes for complex operations

### Error Logging & Debugging
- Use centralized logger for all errors and warnings
- Include context with each log entry
- Provide easy copying of logs for sharing
- Create development-only log viewer component
- Track errors with appropriate stack traces

### Testing Plan
- Unit tests for utility functions
- Component tests for UI elements
- Integration tests for key user flows
- End-to-end tests for critical paths

## Next Steps
Implement Phase 9 (Simulation Tool), creating a what-if scenarios interface that allows users to model different financial outcomes. This module will help users understand potential future financial states based on various assumptions and planning scenarios. 