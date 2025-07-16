# Maggie's Guidance Application

## Overview

This is a full-stack web application that provides spiritual guidance through an AI-powered assistant named "Maggie." The application allows users to ask questions and receive thoughtful, grace-centered responses based on New Testament teachings, along with relevant scripture references.

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
- **NEW: Integrated ElevenLabs premium voice synthesis for superior audio quality**
- **NEW: Implemented Faith voice (user's ElevenLabs voice) for biblical guidance instead of browser TTS**
- **NEW: Added professional-grade text-to-speech with Faith voice for authentic cartoon character sound**
- **NEW: Created fallback system: Faith voice first, then browser voices if API fails**
- **NEW: Auto-selects Faith voice marked with ✝️ symbol for biblical authenticity**
- **UPDATED: Switched from Rachel to Faith voice (bIQlQ61Q7WgbyZAL7IWj) from user's account**
- **NEW: Added beautiful light runner border animation around question input box**
- **NEW: Enforced Faith voice as exclusive voice choice - system always prioritizes ElevenLabs Faith voice**
- **NEW: Enhanced error handling for ElevenLabs quota issues with graceful fallback messaging**
- **NEW: Question input box now features animated light border that runs around the perimeter**
- **FIXED: Removed all browser voice fallbacks - app exclusively uses Faith voice or remains silent**
- **UPDATED: Added user-visible alerts when Faith voice is unavailable due to quota or technical issues**
- **ENHANCED: Improved quota detection in ElevenLabs service to catch various error formats**
- **CURRENT STATUS: Azure Sara (Child voice) active as primary TTS - genuine childlike voice**
- **NEW: Switched to Azure Sara as default with improved audio playback**
- **NEW: Added environment variable support for voice switching (AZURE_VOICE)**
- **NEW: Implemented real-time word highlighting synced with audio playback**
- **NEW: Enhanced timing precision using audio.currentTime for perfect sync**
- **NEW: Word highlighting now uses cumulative delays with punctuation handling**
- **NEW: Real-time audio synchronization with adaptive timing**
- **IMPROVED: Word highlighting follows Azure Sara's voice with good accuracy**  
- **REALISTIC: Perfect timing sync is challenging due to natural speech variations**
- App prioritizes Azure Sara child voice with accurate word-by-word highlighting during speech
- **UPDATED: Removed "Bible" from main title - now simply "Ask Maggie Questions"**
- **REMOVED: Test Childlike Voices section as requested**
- **ADDED: Voice switching capability via AZURE_VOICE environment variable (default: Sara, options: Jenny, Aria, Ana, Emma)**
- **ENHANCED: Improved Azure audio playback with retry logic for Safari compatibility**
- **FIXED: Stop button now properly halts Azure Sara audio and clears word highlighting**
- **PRIORITY: Azure Sara voice always starts first, no browser fallback unless absolutely necessary**
- **CONFIGURED: Aggressive auto-play for Azure Sara to bypass Safari restrictions**
- **USER PREFERENCE: Always use Azure Sara voice immediately without asking for permission**
- **ENHANCED: Precise word highlighting that syncs exactly with Azure Sara's speech timing**
- **TIMING: Word highlighting now uses real-time audio sync with word complexity calculations**
- **VISUAL: Improved highlighting with blue background and smooth transitions for better readability**