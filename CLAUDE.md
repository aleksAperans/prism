# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application called "Prism" - a Sayari entity screening application for compliance management. The app uses React 19, TypeScript, Prisma with PostgreSQL, NextAuth for authentication, and shadcn/ui components with Tailwind CSS.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Database operations (when Prisma is properly configured)
npx prisma generate        # Generate Prisma client
npx prisma db push         # Push schema changes to database
npx prisma studio          # Open Prisma Studio
```

## Architecture Overview

### Directory Structure
- `/src/app/` - Next.js App Router pages and API routes
- `/src/components/` - React components organized by feature
- `/src/lib/` - Shared utilities, configuration, auth, and Prisma client
- `/src/services/` - API services and business logic
- `/src/hooks/` - Custom React hooks
- `/src/types/` - TypeScript type definitions
- `/prisma/` - Database schema and migrations

### Key Components
- **Authentication**: NextAuth with credentials provider (demo users)
- **Database**: Prisma ORM with PostgreSQL schema
- **API Layer**: Next.js API routes in `/app/api/`
- **UI Components**: shadcn/ui components in `/components/ui/`
- **State Management**: React Query for server state, Context API for global state
- **Country Display**: Centralized CountryBadge and CountryBadgeList components with flag + 3-digit ISO format

### Authentication
Demo credentials:
- Admin: `admin@sayari.com` / `admin123`
- User: `user@sayari.com` / `user123`

### Database Schema
Core entities: User, Project, ProjectMember, ScreeningResult, RiskFactor, AuditLog, UserSession, BatchJob

### API Integration
- Sayari API client with authentication token management
- Rate limiting and retry logic with exponential backoff
- Error handling with custom SayariAPIError class
- Request/response interceptors for logging and auth

### Key Services
- `src/services/api/client.ts` - Axios client with Sayari API integration
- `src/services/api/auth.ts` - Sayari authentication service
- `src/services/api/screening.ts` - Entity screening operations
- `src/services/api/projects.ts` - Project management

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `SAYARI_CLIENT_ID` - Sayari API client ID
- `SAYARI_CLIENT_SECRET` - Sayari API client secret
- `SAYARI_ENV` - Sayari environment (sandbox/production)
- `NEXTAUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - NextAuth callback URL

## Frontend Best Practices & Design Principles

### shadcn/ui Component Usage
- **ALWAYS use shadcn/ui components** for UI elements instead of creating custom components from scratch
- Visit https://ui.shadcn.com/docs/components/ for complete component documentation and examples
- Use the CLI to install new components: `npx shadcn@latest add [component-name]`
- Existing components are in `/src/components/ui/` and should be used consistently

### Shared Component Guidelines
- **Use existing shared components** instead of creating duplicates or using basic HTML/shadcn components directly
- **Country Display**: ALWAYS use `CountryBadge` or `CountryBadgeList` components for displaying countries
  - Shows flag + 3-digit ISO code format consistently
  - Located in `/src/components/common/CountryBadge.tsx`
  - Never use plain Badge components for countries
- **Risk Badges**: Use `RiskScoreBadge` for risk score display with proper theming
- **Type Badges**: Use consistent entity type badges with Building/User icons
- **Before creating new components**: Check `/src/components/common/` for existing shared components
- **Component Discovery**: Use `find src/components -name "*.tsx" | grep -i [keyword]` to find existing components

### Component Guidelines
- **Composition over customization**: Use shadcn components as building blocks and compose them together
- **Consistent styling**: All styling should use Tailwind CSS classes, following shadcn patterns
- **Accessibility first**: shadcn components come with built-in accessibility, maintain these standards
- **TypeScript strict**: All components must be fully typed with proper TypeScript interfaces
- **Badge text formatting**: All badge text must be in lowercase for consistency across the application

### State Management Patterns
- **Server state**: Use React Query (@tanstack/react-query) for all API data fetching and caching
- **Client state**: Use React's built-in useState/useReducer for local component state
- **Global state**: Use Context API sparingly, prefer prop drilling or lifting state up
- **Form state**: Use React Hook Form with Zod validation for all forms

### File Organization
- **Feature-based**: Group components by feature/domain (e.g., `/components/screening/`, `/components/projects/`)
- **Reusable components**: Place in `/components/common/` for cross-feature usage
- **Custom hooks**: Create in `/src/hooks/` with descriptive names (e.g., `useProjects`, `useScreening`)

### Error Handling & Loading States
- Use shadcn Alert components for error messages
- Implement loading states with shadcn Skeleton components
- Use ErrorBoundary components for component-level error handling
- Show user-friendly error messages, log technical details to console

### Styling Guidelines
- Use Tailwind utility classes, avoid custom CSS where possible
- Follow shadcn color scheme and design tokens
- Use CSS variables for theme consistency
- Responsive design: mobile-first approach with Tailwind breakpoints

## Development Notes

- The app includes comprehensive error handling and logging
- Database operations include fallback to mock data when DB is unavailable
- Risk factors are managed both at entity and match levels
- The application supports batch operations for large-scale screening
- All API routes are protected with authentication middleware
- The UI uses a dark/light theme toggle with next-themes
- Always reference shadcn documentation when implementing new UI features