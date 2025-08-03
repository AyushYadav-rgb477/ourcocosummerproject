# CollabFund - Student Collaboration and Funding Platform

## Overview

CollabFund is a web-based platform designed for college students to share their creative projects, secure funding, and collaborate with peers. The platform enables students to showcase innovative ideas, connect with potential collaborators, and receive financial support for their projects.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack**: Static HTML/CSS/JavaScript frontend served by Flask
- **Design Pattern**: Multi-page application with separate HTML files for different sections
- **UI Framework**: Custom CSS with Font Awesome and Bootstrap Icons for visual elements
- **Navigation**: Single-page application feel with JavaScript-driven navigation and dynamic content loading

### Backend Architecture
- **Framework**: Flask (Python web framework)
- **Structure**: Modular design with separate files for app configuration, models, and routes
- **API Design**: RESTful API endpoints under `/api/*` prefix with CORS enabled
- **Session Management**: Flask sessions with configurable secret key

### Database Architecture
- **ORM**: SQLAlchemy with Flask-SQLAlchemy extension
- **Database**: PostgreSQL (configurable via DATABASE_URL environment variable)
- **Schema Design**: Relational model with proper foreign key relationships and cascading deletes

## Key Components

### User Management System
- **Authentication**: Username/password-based authentication with secure password hashing using Werkzeug
- **User Model**: Stores user profile information including username, email, full name, and college affiliation
- **Session Handling**: Server-side session management for maintaining user state

### Project Management System
- **Project Model**: Core entity storing project details including title, description, category, funding goals, and status
- **Project States**: Active, completed, and paused project statuses
- **Funding Tracking**: Current funding vs. funding goal tracking

### Collaboration Features
- **Comments System**: User-generated comments on projects with author relationships
- **Voting System**: User voting mechanism for project popularity
- **Collaboration Tracking**: Many-to-many relationships between users and projects
- **Donation System**: Financial contribution tracking between users and projects

### Frontend Pages
- **Landing Page**: Hero section with typewriter effect and feature showcase
- **Authentication Pages**: Separate login and registration forms with modern UI
- **Browse Page**: Project discovery with filtering and search capabilities
- **Dashboard**: User-specific project management and collaboration overview

## Data Flow

### Authentication Flow
1. User submits credentials via login form
2. Flask backend validates credentials against database
3. Session is created and stored server-side
4. Frontend JavaScript checks authentication status and updates UI accordingly

### Project Management Flow
1. Authenticated users create projects via dashboard
2. Projects are stored in database with owner relationships
3. Projects appear in browse section for discovery
4. Users can interact with projects through comments, votes, and collaboration requests

### Funding Flow
1. Users discover projects through browse functionality
2. Donation system tracks financial contributions
3. Project funding progress is updated in real-time
4. Project owners can monitor funding status through dashboard

## External Dependencies

### Frontend Libraries
- **Font Awesome 6.5.0**: Icon library for consistent visual elements
- **Bootstrap Icons 1.11.3**: Additional icon set for UI components

### Backend Dependencies
- **Flask**: Core web framework
- **Flask-SQLAlchemy**: Database ORM integration
- **Flask-CORS**: Cross-origin resource sharing support
- **Werkzeug**: Security utilities for password hashing and proxy handling

### Database
- **PostgreSQL**: Primary database system with connection pooling and health checks
- **SQLAlchemy**: Database abstraction layer with declarative models

## Deployment Strategy

### Environment Configuration
- **Database**: Configurable via DATABASE_URL environment variable with fallback to local PostgreSQL
- **Security**: SESSION_SECRET environment variable for session encryption
- **Development**: Debug mode enabled with hot reloading

### Server Configuration
- **WSGI**: ProxyFix middleware for proper header handling behind reverse proxies
- **Static Files**: Flask serves static assets (HTML, CSS, JS) from `/static` directory
- **CORS**: Enabled for `/api/*` endpoints to support frontend-backend separation

### Database Management
- **Schema Creation**: Automatic table creation on application startup
- **Connection Management**: Connection pooling with 300-second recycle time and pre-ping health checks
- **Model Relationships**: Proper foreign key constraints with cascading delete operations

### Scalability Considerations
- **Session Storage**: Server-side sessions (may need external session store for scaling)
- **Static Assets**: Served directly by Flask (consider CDN for production)
- **Database Connections**: Connection pooling configured for concurrent users

## Recent Changes: Latest modifications with dates

### August 3, 2025 - Dark Theme Implementation and Enhanced Notifications System
- **Comprehensive Dark Theme Implementation**:
  - Created dark-theme-override.css with consistent #0d0d0d background across all pages
  - Applied dark theme to index.html, browse.html, dashboard.html, discussion.html, login.html, register.html, profile.html, and notifications.html
  - Dark navbar with #0d0d0d background and light text (#ffffff)
  - Enhanced scrollbar styling with dark colors
  - Dark form elements with rgba backgrounds and light borders
  - Consistent button styling with golden accent (#ffd700)
- **Real-time Notifications System**:
  - Created comprehensive notifications.html page with dark theme consistency
  - Added Notifications tab to navigation bar across all pages with badge counter
  - Notification filtering by type: reactions, comments, collaborations, donations
  - Guest-friendly UI with login prompts for non-authenticated users
  - Mark all read and clear all functionality
  - Loading skeletons and empty states for better UX
- **LinkedIn-style Enhanced Reaction System**:
  - Press-and-hold functionality for mobile devices with haptic feedback
  - Reaction viewing modal showing users who reacted with specific reaction types
  - Enhanced reaction picker with emoji overlays and improved hover effects
  - Clickable reaction counts that open detailed reaction viewer
  - Multiple reaction types: Like (👍), Celebrate (🎉), Support (❤️), Insightful (💡), Curious (🤔)
- **Discussion Page Improvements**:
  - Removed "People You May Know" and "Active Now" sidebar boxes as requested
  - Replaced with "Trending Topics" section
  - Enhanced reaction modal integrated into discussion page
  - Improved dark theme consistency for all discussion elements
- **API Endpoints for Notifications**:
  - GET /api/notifications - Fetch user notifications with filtering
  - GET /api/notifications/unread-count - Get unread notification count
  - POST /api/notifications/<id>/read - Mark specific notification as read
  - POST /api/notifications/mark-all-read - Mark all notifications as read
  - DELETE /api/notifications/clear-all - Clear all notifications
  - GET /api/posts/<id>/reactions/details - Get detailed reaction information with user names
- **Navigation and UX Enhancements**:
  - Notification badge with red counter showing unread notifications
  - Consistent navigation across all pages with active state indicators
  - Reduced message popup duration to 1.5 seconds for better user experience
  - Modal close functionality with click-outside-to-close behavior
  - Mobile-responsive design with touch-friendly interactions

### July 31, 2025 - UI/UX Improvements and Profile Management
- **Removed "Latest Projects" section** from homepage per user request
- **Implemented dark theme for dashboard** - Changed background from light (#f5f7fa) to dark (#1a1a2e) for better contrast and visibility
- **Added Font Awesome user profile dropdown** with:
  - Profile button with fa-user-circle icon
  - Dropdown menu with "View Profile" and "Logout" options
  - Proper click handling and smooth animations
- **Created comprehensive profile management system**:
  - New profile.html page with dark theme consistency
  - Bank details form with validation (Account holder, Bank name, Account number, IFSC, UPI ID, Phone)
  - Real-time JavaScript form validation with error messages
  - QR code generation for UPI donations using qrcode.js library
  - Download and share QR code functionality
  - Profile information editing (full name, college)
- **Enhanced collaboration system**:
  - Added proper error handling for collaboration requests
  - Dynamic loading with placeholder states when no data exists
  - Accept/reject functionality for collaboration requests
- **Added new API endpoints**:
  - PUT /api/user/profile - Update user profile information
  - GET /api/collaborations - Get user collaboration requests
  - POST /api/collaborations/<id>/<action> - Accept/reject collaborations
- **UI/UX Improvements**:
  - Dark theme consistency across dashboard and profile pages
  - Improved form styling with proper focus states
  - Better error message handling and display
  - Responsive design for mobile devices