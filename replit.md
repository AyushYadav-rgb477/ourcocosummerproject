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

### August 3, 2025 - User Profile Page Removal and UI Enhancements
- **Removed user-profile.html page completely** as requested by user:
  - Deleted static/user-profile.html, static/user-profile.css, and static/js/user-profile.js files
  - Removed corresponding route /user-profile.html from routes.py
  - Updated viewProfile function in users.js to redirect to profile.html instead
  - Cleaned up all references to the removed user profile page
- **Enhanced discussion page with improved interactions**:
  - Added comprehensive tags functionality with interactive suggestions and selection
  - Implemented enhanced hover effects for post type buttons (events, polls, help, discussion)
  - Fixed time display formatting with proper date handling for posts
  - Disabled all popup messages across the application as requested
- **Updated users page with consistent dark theme**:
  - Applied same dark background (#0d0d0d) as discussion page
  - Updated navigation bar styling to match discussion page
  - Enhanced user profile dropdown functionality
  - Filtered out current user from users list when authenticated
- **Improved overall user experience**:
  - Color-coded hover effects for different post types
  - Smooth animations and transitions for interactive elements
  - Consistent scrollbar styling across dark theme pages
  - Enhanced dropdown menu functionality with proper event handling

### August 3, 2025 - Complete LinkedIn-style Discussion Platform with Public Access and Reactions
- **Created comprehensive discussion platform** similar to LinkedIn home feed:
  - New discussion.html page with full social media functionality
  - Dark theme consistent with platform design
  - Three-column layout: user sidebar, main feed, suggestions sidebar
- **Public access implementation**:
  - Discussion page accessible without login requirement
  - Guest users can view all posts and discussions
  - Disabled post creation and interactions for non-authenticated users
  - Login prompts for interactive features
- **Social features and interactions**:
  - Multiple post types: discussions, help requests, polls, events
  - Interactive feed with filtering tabs (All Posts, Help, Discussions, Polls, Events)
  - Post creation modal with rich content options
  - Like, comment, share, and save functionality
  - User engagement features: trending topics, user suggestions, active users
- **Database architecture for discussions**:
  - DiscussionPost model with support for multiple post types
  - PostComment model with nested comment capability
  - PostLike and PostSave models for user interactions
  - Tag system and anonymous posting options
- **Navigation updates**:
  - Added Discussion link to all page navigation bars
  - Discussion link visible to all users regardless of authentication status
  - Maintained existing authentication-based navigation for Dashboard
- **UX improvements**:
  - Reduced popup message duration to 1.5 seconds for better UX
  - Guest-friendly UI with clear login prompts
  - Responsive design for mobile and tablet devices
- **LinkedIn-style Reaction System**:
  - Implemented multiple reaction types: Like, Celebrate, Support, Insightful, Curious
  - Hover-based reaction picker similar to LinkedIn's interface
  - Real-time reaction count updates without page refresh
  - PostReaction model supporting one reaction per user per post with type changes
- **Enhanced Navigation and Authentication**:
  - Discussion link visible to all users in navigation bar
  - Seamless authentication status checking for public access
  - User profile dropdown with Dashboard and Profile access for authenticated users
  - Dynamic UI updates based on authentication status
- **Comprehensive API endpoints added**:
  - GET /api/posts - Fetch discussion posts with filtering by type
  - POST /api/posts - Create new discussion posts with multiple types
  - POST /api/posts/<id>/reactions - LinkedIn-style reaction system
  - GET/POST /api/posts/<id>/comments - Nested comment management
  - GET /api/auth/status - Authentication status checking
  - GET /api/user/stats - User statistics for posts and connections
- **UI/UX Enhancements**:
  - Dark theme consistency with homepage gradient background
  - Loading skeletons and empty states for better user experience
  - Responsive design for mobile and tablet devices
  - Guest-friendly interface with clear calls-to-action for registration

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