# HydroSafe - AI Emergency Response Co-Pilot

## Overview

HydroSafe is a sophisticated emergency response management system designed for offshore operations, specifically built for HydroDive's marine safety protocols. The application serves as an AI-powered co-pilot that assists emergency response teams using a Bronze-Silver-Gold command hierarchy system.

The system combines real-time incident management, intelligent decision-making support, team coordination, and comprehensive audit trails to ensure rapid and effective emergency response in offshore environments.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: TailwindCSS with custom HydroDive brand colors and themes
- **State Management**: TanStack React Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints with WebSocket support for real-time communication
- **File Handling**: Multer for multipart file uploads with metadata tracking
- **Session Management**: Express sessions with PostgreSQL store

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema versioning
- **Connection**: Neon serverless with WebSocket support for edge environments

## Key Components

### Emergency Response System
- **Bronze-Silver-Gold Hierarchy**: Multi-tier command structure for offshore operations
- **Dynamic Incident Management**: AI-powered checklist generation based on incident type and severity
- **Real-time Communication**: WebSocket-based messaging with urgency prioritization
- **Photo Documentation**: Timestamped photo uploads with GPS metadata for evidence collection

### AI Integration
- **OpenAI GPT-4o Integration**: Latest model for intelligent response generation
- **Dynamic Checklist Generation**: Context-aware emergency procedures
- **Risk Assessment**: Automated threat evaluation and mitigation strategies
- **Decision Support**: IAPOAR model implementation (Information, Assessment, Powers, Options, Action, Review)

### User Management
- **Role-based Access Control**: Bronze (On-Scene), Silver (Tactical), Gold (Strategic) permissions
- **Project Assignment System**: Users assigned to specific offshore projects with role flexibility
- **Activity Tracking**: Last seen timestamps and active status monitoring

### Project Management
- **Multi-project Support**: Designed for concurrent offshore operations
- **Client Integration**: Shell SPDC Forcados project as primary use case
- **Emergency Contacts**: Verified contact database with response time tracking
- **Asset Management**: Equipment and resource tracking with JSON storage

## Data Flow

### Incident Lifecycle
1. **Detection**: Incident creation through manual reporting or system alerts
2. **Assessment**: AI-powered risk analysis and priority assignment
3. **Response**: Dynamic checklist generation based on incident type and user role
4. **Communication**: Real-time updates through WebSocket connections
5. **Documentation**: Photo uploads and action logging for audit compliance
6. **Resolution**: Status tracking and post-incident review

### Real-time Communication
- WebSocket connections for instant messaging and status updates
- Message prioritization with urgency flags
- Broadcast capabilities for system-wide alerts
- Persistent message storage with sender identification

### File Management
- Secure upload handling with size limits (10MB)
- Metadata extraction including timestamp, GPS coordinates, device info
- Storage organization by project and incident
- Audit trail for all file operations

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL hosting with automatic scaling
- **Connection Pooling**: Built-in connection management for high availability

### AI Services
- **OpenAI API**: GPT-4o model for intelligent response generation
- **API Key Management**: Environment variable configuration with fallback handling

### Development Tools
- **Replit Integration**: Development environment with automatic deployment
- **Vite Plugins**: Runtime error overlay and development cartographer
- **TypeScript**: Full type safety across frontend and backend

### UI Components
- **Radix UI**: Accessible component primitives
- **Lucide Icons**: Consistent iconography throughout the application
- **Date-fns**: Date manipulation and formatting utilities

## Deployment Strategy

### Development Environment
- **Replit Hosting**: Integrated development and deployment platform
- **Hot Module Replacement**: Instant code updates during development
- **Environment Variables**: Secure configuration management

### Production Configuration
- **Build Process**: Vite for frontend, esbuild for backend bundling
- **Static Asset Serving**: Express static middleware for production builds
- **Port Configuration**: Auto-scaling deployment with external port 80

### Database Management
- **Schema Migrations**: Drizzle Kit for version-controlled database changes
- **Connection Security**: SSL-enabled connections with environment-based URLs
- **Backup Strategy**: Neon automatic backups and point-in-time recovery

## Changelog

Changelog:
- June 19, 2025. Initial setup
- June 19, 2025. Implemented real-time activity tracking system with WebSocket connections
- June 19, 2025. Added clickable emergency contacts with direct phone call functionality
- June 19, 2025. Fixed database foreign key constraints and accessibility warnings
- June 19, 2025. Completed comprehensive authentication system with email/password, Google, and Apple login options
- June 19, 2025. Fixed emergency contact update functionality and changed button text to "Add/Update Contact" with proper form state management
- June 19, 2025. Created comprehensive Asset Verification system with photo upload, timestamp tracking, and comment functionality for offshore asset management
- June 19, 2025. Optimized Asset Verification page layout for better space utilization with left-aligned content and responsive grid layouts
- June 19, 2025. Resolved app startup issues by fixing port conflicts and JavaScript errors in communication hub component
- June 19, 2025. Simplified navigation by implementing dropdown menus for Assets and Reports sections to reduce interface complexity and improve user experience
- June 19, 2025. Implemented modern HydroSafe design system with role-based color coding (Gold: yellow, Silver: blue, Bronze: orange), status-aware card styling, and professional visual hierarchy for enhanced trust and usability
- June 19, 2025. Implemented comprehensive project management system with role-based access control allowing Gold users to create/edit projects while Silver/Bronze users have view-only access to assigned projects with seamless project switching functionality
- June 19, 2025. Created AI Audit Referee system with real-time compliance monitoring using OpenAI GPT-4o to review all actions against IMCA, IOGP, and HydroDive safety protocols with automatic violation detection and action blocking

## User Preferences

Preferred communication style: Simple, everyday language.
Navigation preferences: Single dropdown menu to avoid congestion - prefer one "Management" dropdown containing Assets and Reports options rather than multiple separate dropdowns.