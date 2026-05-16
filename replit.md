# HydroSafe - AI Emergency Response Co-Pilot

## Overview
HydroSafe is an AI-powered emergency response management system for offshore operations, specifically designed for HydroDive's marine safety protocols. It acts as an AI co-pilot, assisting emergency response teams within a Bronze-Silver-Gold command hierarchy. The system integrates real-time incident management, intelligent decision support, team coordination, and comprehensive audit trails to ensure rapid and effective emergency response in offshore environments. Its capabilities include dynamic checklist generation, risk assessment, and decision support based on the IAPOAR model, aiming to enhance safety and efficiency in critical situations.

## User Preferences
Preferred communication style: Simple, everyday language.
Navigation preferences: Single dropdown menu to avoid congestion - prefer one "Management" dropdown containing Assets and Reports options rather than multiple separate dropdowns.

## System Architecture
HydroSafe utilizes a modern web application architecture. The **Frontend** is built with React 18 and TypeScript, using Vite for fast development, Shadcn/ui (on Radix UI) for UI components, TailwindCSS for styling, TanStack React Query for state management, Wouter for routing, and React Hook Form with Zod for form handling. The **Backend** uses Node.js with Express.js and TypeScript, providing RESTful APIs with WebSocket support for real-time communication. Multer handles file uploads, and Express sessions manage user sessions.

**Data Storage** relies on PostgreSQL (Neon serverless) with Drizzle ORM for type-safe operations and Drizzle Kit for schema management.

Key functional components include:
- **Emergency Response System**: Implements a Bronze-Silver-Gold command hierarchy, AI-powered dynamic checklist generation, real-time WebSocket communication, and timestamped photo documentation with GPS metadata.
- **AI Integration**: Leverages OpenAI GPT-4o for intelligent response generation, dynamic checklist creation, automated risk assessment, and decision support following the IAPOAR model.
- **Scientific Decision Intelligence**: Shared client/server logic now lives in `shared/incident-analysis`. It adds deterministic risk scoring with likelihood, consequence, exposure, vulnerability, detectability gap, and resource-strain dimensions. Incident recommendations include evidence cards, uncertainty statements, action deadlines, verification requirements, low-resource plans, and report structures.
- **Low-Resource Field Mode**: Tracks online/offline state, browser offline-storage readiness, queued field records, and degraded/offline-critical operating mode. `client/src/lib/offlineQueue.ts` queues emergency acknowledgments, emergency submissions, near misses, and observations in IndexedDB, mirrors queue counts to localStorage, and replays writes on startup/online events.
- **Fire Intelligence System** (Fire Aladdin): Geo/environment-aware incident matching engine that learns from historical offshore fire disasters (Piper Alpha 1988, Deepwater Horizon 2010). Uses vector similarity, geographic proximity, seasonal alignment, and wind direction scoring to surface relevant historical lessons during emergency response. Provides one-liner prefaces like "Because your context resembles Piper Alpha conditions..." and displays matched incidents with lessons learned, ignition sources, and failed barriers in the Emergency Protocols UI.
- **User Management**: Features role-based access control (Bronze, Silver, Gold), project assignment, and activity tracking.
- **Project Management**: Supports multi-project operations, client integration (e.g., Shell SPDC), emergency contact management, and asset tracking.
- **Data Flow**: Manages the incident lifecycle from detection to resolution, real-time communication via WebSockets, and secure file handling with metadata extraction.
- **Visuals**: Incorporates a futuristic visual effects system with glassy backgrounds, neon borders, animated glows, and sci-fi styling, including role-based color coding (Gold: yellow, Silver: blue, Bronze: orange).
- **Frontend Organization**: Feature code is now grouped under `client/src/features/<domain>`, app shell code under `client/src/app`, shared primitives under `client/src/components/ui`, cross-cutting frontend utilities under `client/src/lib`, and shared client/server domain logic under `shared`.

## External Dependencies

- **Database Services**: Neon PostgreSQL (serverless hosting with automatic scaling and connection pooling).
- **AI Services**: OpenAI API (GPT-4o model for intelligent response generation).
- **UI Components**: Radix UI (accessible component primitives), Lucide Icons (consistent iconography), Date-fns (date manipulation).
- **Development Tools**: Replit (integrated development and deployment), Vite (frontend build tool), TypeScript (language).
