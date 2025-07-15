# Maggie's Biblical Guidance Application

## Overview

This is a full-stack web application that provides biblical guidance through an AI-powered assistant named "Maggie." The application allows users to ask biblical questions and receive thoughtful, grace-centered responses based on New Testament teachings, along with relevant scripture references.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend and backend concerns:

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Style**: RESTful JSON API
- **Session Management**: Express sessions with PostgreSQL storage
- **Development**: Hot reloading with Vite integration

## Key Components

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: Neon Database (serverless PostgreSQL)
- **Schema**: Two main tables - `users` and `questions`
- **Storage Strategy**: In-memory storage for development, PostgreSQL for production

### AI Integration
- **Provider**: OpenAI GPT-4o model
- **Purpose**: Generate biblical responses with grace-focused theology
- **Response Format**: Structured JSON with answer and scripture references
- **Theological Approach**: Emphasizes New Testament grace, love, and finished work of Christ

### UI Components
- **Design System**: shadcn/ui with "new-york" style variant
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Responsive**: Mobile-first design with responsive breakpoints
- **Accessibility**: Built on Radix UI primitives for accessibility compliance

## Data Flow

1. **User Input**: User submits a biblical question through the textarea component
2. **Validation**: Client-side validation ensures question meets minimum length requirements
3. **API Request**: Frontend sends POST request to `/api/ask-maggie` endpoint
4. **AI Processing**: Backend calls OpenAI API with theologically-informed prompt
5. **Data Persistence**: Question and AI response are saved to database
6. **Response**: Structured response returned to frontend with answer and scripture references
7. **UI Update**: Response displayed in formatted card with scripture references

## External Dependencies

### Core Dependencies
- **Database**: `@neondatabase/serverless` for Neon Database connectivity
- **ORM**: `drizzle-orm` and `drizzle-kit` for database operations
- **AI**: `openai` SDK for GPT-4o integration
- **UI**: `@radix-ui/*` packages for accessible component primitives
- **Styling**: `tailwindcss` with `class-variance-authority` for component variants
- **State**: `@tanstack/react-query` for server state management

### Development Dependencies
- **Build**: `vite` with React plugin and custom Replit integration
- **TypeScript**: Full TypeScript support with path mapping
- **Development**: `tsx` for TypeScript execution and hot reloading

## Deployment Strategy

### Development Environment
- **Server**: Express server with Vite middleware for HMR
- **Database**: In-memory storage fallback with Drizzle schema
- **Environment**: Development mode with runtime error overlay

### Production Build
- **Frontend**: Vite production build with optimized assets
- **Backend**: ESBuild compilation to single bundle
- **Database**: PostgreSQL with Drizzle migrations
- **Environment Variables**: `DATABASE_URL` and `OPENAI_API_KEY` required

### Key Configuration Files
- `drizzle.config.ts`: Database migration and schema configuration
- `vite.config.ts`: Frontend build and development server setup
- `package.json`: Scripts for development, build, and deployment
- `tsconfig.json`: TypeScript configuration with path mapping

The application is designed to be easily deployable on Replit with automatic environment detection and graceful fallbacks for missing dependencies.

## Recent Changes

### January 15, 2025
- Successfully duplicated the original Maggie Bible Questions app
- Modified layout to move Maggie's image to a small circular logo next to the title
- Added blue-to-red gradient text effect on the main heading
- Updated explanatory text to reference "conservative evangelical pastors and experts"
- Added soft shadow to question input box with focus enhancement
- Implemented comprehensive speech recognition system using react-speech-recognition library
- Added microphone device selection and testing functionality
- Discovered AirPods compatibility issues with Web Speech API - works better with built-in microphone
- Implemented 2-second silence auto-submission for voice recognition
- Added age-appropriate Christian website URLs to biblical responses
- Integrated trusted resources: The Bible Project, Trueway Kids, Focus on the Family, Creative Bible Study, Gospel Project, Bible for Children
- Made website recommendations clickable links that open in new tabs
- Enhanced biblical guidance with study websites for families and children
- App is fully functional and stable for biblical Q&A with both text and voice input