# Gestor IASD - Volunteer Schedule Management System

## Overview

This is a web-based volunteer schedule management system designed for churches (specifically Seventh-day Adventist churches - IASD). The application allows organizations to manage volunteers, ministries, event types, teams, and service schedules. It's built as an MVP focused on simplicity and reliability, using Supabase as the backend-as-a-service and React for the frontend.

The system supports multi-tenant organizations where volunteers can have different access levels (admin, leader, volunteer) and can be assigned to various ministries and services.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite for development and production builds
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React hooks for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Primary Backend**: Supabase (Backend-as-a-Service)
  - Authentication: Supabase Auth with email/password
  - Database: PostgreSQL hosted on Supabase
  - Row Level Security (RLS) for authorization
- **Express Server**: Minimal Express.js server used primarily for:
  - Serving the built frontend in production
  - Vite dev server middleware in development
  - No custom API routes - all data flows through Supabase client-side

### Data Layer
- **ORM**: Drizzle ORM for schema definition and type generation
- **Schema Location**: `shared/schema.ts` - defines table structures that mirror Supabase tables
- **Key Entities**:
  - `organizations` - Multi-tenant organizations (churches)
  - `volunteers` - Users with access levels and ministry assignments
  - `ministries` - Ministry groups within an organization
  - `teams` - Groups of volunteers
  - `event_types` - Types of events/services
  - `services` - Scheduled events with volunteer assignments

### Authentication Flow
1. User logs in via Supabase Auth (email/password)
2. Session managed by Supabase client-side
3. Volunteer profile fetched using `auth_user_id` to link auth user to volunteer record
4. Access level (admin/leader/volunteer) determines UI capabilities
5. All database queries go directly to Supabase from the client

### Build System
- Development: `npm run dev` - runs Vite dev server with HMR via Express
- Production: `npm run build` - uses esbuild for server, Vite for client
- Database: `npm run db:push` - syncs Drizzle schema to database

## External Dependencies

### Supabase (Required)
- **Purpose**: Authentication, database, and real-time features
- **Environment Variables**:
  - `VITE_SUPABASE_URL` - Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - Supabase anonymous/public API key
- **Client**: `@supabase/supabase-js` initialized in `client/src/lib/supabase.ts`

### PostgreSQL Database
- **Connection**: Via `DATABASE_URL` environment variable
- **Usage**: Drizzle ORM connects for schema management and migrations
- **Note**: The app primarily uses Supabase client-side; the server-side DB connection is for Drizzle tooling

### Key NPM Packages
- `@tanstack/react-query` - Data fetching and caching
- `drizzle-orm` / `drizzle-kit` - ORM and migration tooling
- `date-fns` - Date formatting (Portuguese locale support)
- `zod` - Schema validation
- `wouter` - Client-side routing
- Radix UI primitives - Accessible component foundations

### Replit-Specific Plugins
- `@replit/vite-plugin-runtime-error-modal` - Error overlay
- `@replit/vite-plugin-cartographer` - Development tooling
- `@replit/vite-plugin-dev-banner` - Development banner