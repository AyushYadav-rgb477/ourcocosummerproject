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
- **User Model**: Comprehensive user profiles with personal info, contact details, social links, and professional information
- **Extended Profile Fields**: Phone, location, professional title, Twitter, LinkedIn, GitHub integration (August 2025)
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
- **Browse Page**: Project discovery with filtering and search capabilities with edit/delete functionality
- **Dashboard**: User-specific project management and collaboration overview
- **Discussion Page**: Community discussions with category filtering, search, and full CRUD functionality
- **Profile Page**: Redesigned sidebar layout with profile info on left, content on right (August 2025)

### Edit/Delete Functionality (August 2025)
- **Complete CRUD Operations**: Full edit and delete functionality implemented across all content types
- **Projects**: Users can edit and delete their own projects with ownership verification
- **Comments**: Project comments can be edited and deleted by their authors
- **Discussions**: Full discussion management with edit, delete, and category-based filtering
- **Discussion Replies**: Nested reply system with edit/delete capabilities and reaction features
- **Ownership Security**: Backend verification ensures users can only modify their own content
- **UI Integration**: Hover-based edit/delete overlays with modern CSS styling

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

## Recent Changes (August 2025)

### Fixed Notification System
- **Issue**: Mark as read functionality was not working properly
- **Solution**: Implemented dedicated Notification model with proper persistence
- **Impact**: Users can now mark notifications as read, mark all as read, and clear notifications

### Enhanced Team Management  
- **Issue**: Team members were not displayed when collaboration requests were accepted
- **Solution**: Created comprehensive team API that shows accepted collaborators grouped by project
- **Impact**: Users can see their team members organized by project with roles clearly defined

### Project-Based Team Chat
- **Issue**: No communication mechanism between team members
- **Solution**: Implemented project-specific chat system using TeamChat model
- **Impact**: Team members can now communicate within project context, messages are persistent and properly attributed

### Profile Page Redirection
- **Issue**: View Profile button redirected to current user's profile instead of collaborator's profile
- **Solution**: Fixed URL parameter from 'user' to 'user_id' to match profile page implementation
- **Impact**: Users can now correctly view other team members' profiles when clicking "View Profile"

### Enhanced Chat Interface
- **Issue**: Modal-based chat was limiting and not user-friendly for team collaboration
- **Solution**: Replaced modal with sliding right-side chat sidebar showing all team participants
- **Impact**: Improved user experience with persistent chat, participant visibility, and keyboard support

### File Upload System for Projects (August 2025)
- **Feature**: Added comprehensive file attachment system to project creation
- **Implementation**: New ProjectAttachment model with drag-and-drop interface supporting images, documents, and videos
- **Storage**: Files stored in organized directory structure under static/uploads/projects/
- **Validation**: File type checking, size limits (10MB), and duplicate prevention
- **Impact**: Users can now attach supporting files to their projects including documentation, images, and video demonstrations

### Comprehensive CRUD Operations (August 2025)
- **Feature**: Added complete edit/delete functionality for all user-generated content
- **Projects**: Users can edit and delete their own projects with modal-based forms and confirmation dialogs
- **Discussions**: Discussion owners can edit titles, content, categories, and tags, or delete entire discussions
- **Comments**: Inline editing and deletion for comments on both projects and discussions
- **Security**: Proper permission checking ensures users can only modify their own content
- **UI Enhancement**: Subtle action buttons that appear on hover with consistent styling across all content types
- **User Experience**: Confirmation dialogs for destructive actions and success/error messaging for all operations

### Comprehensive Discussion System (August 2025)
- **Feature**: Full-featured discussion platform for project ideas, questions, and community interaction
- **Discussion Creation**: Rich form with categories, tags, content, and image upload capabilities
- **Content Categories**: 8 predefined categories including General, Project Ideas, Questions, Collaboration, Showcase, Feedback, Resources, and Announcements
- **Image Support**: Users can attach images to discussions with drag-and-drop interface and base64 encoding
- **Search and Filtering**: Real-time search by title/content, category filtering, and sorting by recent/popular/most commented
- **Interaction Features**: Like/heart reactions, comments, nested replies, and sharing functionality
- **Complete CRUD**: Full edit/delete capabilities for discussions, comments, and replies with ownership verification
- **Modal Interface**: Detailed discussion view with comment thread in responsive modal design
- **Navigation Integration**: Discussion links added to all pages with active state highlighting
- **API Architecture**: RESTful endpoints with proper authentication, validation, and error handling