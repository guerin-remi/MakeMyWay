# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MakeMyWay is a progressive web app for generating personalized sports routes. It features a **mobile-first design** with a hybrid interface combining floating search elements and detailed configuration panels. The app supports walking, running, and cycling routes with POI integration and GPX export.

**🚨 MANDATORY MOBILE-FIRST DEVELOPMENT 🚨**

This project is developed and tested **exclusively on mobile/small screens**. 

**EVERY SINGLE CHANGE MUST BE IMPLEMENTED IN MOBILE-FIRST APPROACH - NEVER DESKTOP FIRST.**

All development work must be done with mobile context in mind. Any modification, feature addition, bug fix, or enhancement MUST be designed, implemented, and tested primarily for mobile devices.

## Architecture

### Frontend Structure (ES6 Modules)

- **Main entry**: `assets/js/main.js` - Orchestrates all modules and app lifecycle
- **Configuration**: `assets/js/config.js` - Centralized constants and settings
- **Modular system**: `assets/js/modules/` contains specialized services:
  - `UIManager.js` - Main UI orchestrator, delegates to specialized UI managers
  - `MapManager.js` - Google Maps integration and marker management
  - `RouteGenerator.js` - Route generation algorithms and optimization
  - `ApiService.js` - Google Maps APIs (Directions, Places, Geocoding)
  - `FloatingSearchManager.js` - **Mobile-first floating search interface**
  - `AuthService.js` + `AuthUI.js` - User authentication system
  - `ui/` directory: FormManager, POIManager, PanelManager, ResultsManager

### Backend Structure (Node.js/Express)

- **Entry point**: `backend/server.js` - Express server with CORS and MongoDB
- **Routes**:
  - `backend/routes/auth.js` - JWT authentication, user management
  - `backend/routes/maps.js` - Google Maps API proxy with validation
- **Models**: `backend/models/User.js` - MongoDB user schema
- **Deployment**: Uses `render.yaml` for Render.com deployment

## Key Commands

### Backend Development
```bash
cd backend
npm install
npm start        # Production server
npm run dev      # Development server (same as start)
```

### Frontend Development
```bash
# Serve frontend (no build process needed)
python -m http.server 8000
# or
npx http-server
# or
php -S localhost:8000
```

### Deployment
- Frontend: GitHub Pages ready (push to `main` branch)
- Backend: Render.com via `render.yaml` configuration

## 🚨 CRITICAL MOBILE-FIRST DEVELOPMENT REQUIREMENTS

This application is **exclusively developed and tested on mobile devices**. 

**ABSOLUTE REQUIREMENT: ALL CHANGES MUST BE MOBILE-FIRST, NEVER DESKTOP-FIRST.**

Key mobile-first patterns that MUST be followed:

### Touch Event Handling
```javascript
// Use touchstart instead of click for mobile
element.addEventListener('touchstart', handler, { passive: false });
// Always use stopPropagation() to prevent conflicts
event.stopPropagation();
```

### Responsive Design Breakpoints
```css
/* Mobile-first approach - defined in config.js */
MOBILE: 768px
TABLET: 1024px
DESKTOP: 1200px
```

### Hybrid Interface Architecture
The app uses a **dual interface system**:
1. **Floating elements**: Search pill + geolocation button above map
2. **Full panel**: Detailed configuration when needed
3. **Touch-optimized**: Minimum 44px touch targets, smooth animations

## Core Functionality

### Route Generation Process
1. User sets start point (geolocation/search/map click)
2. Selects transport mode (walking/running/cycling) 
3. Sets target distance via slider
4. Optionally adds POI categories or custom places
5. Algorithm generates optimized route using Google Directions API
6. Results displayed with distance/time statistics and GPX export

### API Integration
- **Google Maps JavaScript API**: Map display and interaction
- **Google Directions API**: Route calculation (proxied through backend)
- **Google Places API**: Address autocomplete and POI search
- **Google Geocoding API**: Address/coordinate conversion

## Code Patterns

### Module Initialization
```javascript
// Standard module pattern with dependency injection
class ModuleName {
    constructor(apiService, mapManager, ...) {
        this.apiService = apiService;
        // ...
    }
    async initialize() {
        // Setup DOM, events, etc.
    }
}
```

### Event Handling (Mobile-First)
```javascript
// Always prefer touchstart for mobile interfaces
this.element.addEventListener('touchstart', (e) => {
    e.stopPropagation(); // Prevent event conflicts
    this.handleTouch(e);
}, { passive: false });
```

### Error Handling
```javascript
// Consistent error logging pattern
console.error('❌ Error type:', error);
// Use emojis for visual distinction in logs
console.log('✅ Success message');
console.warn('⚠️ Warning message');
```

## Configuration

### Environment Variables (Backend)
```bash
MONGO_URI=mongodb://...
JWT_SECRET=your-secret
MAPS_API_KEY=your-google-api-key
FRONTEND_URL=https://your-frontend-url
NODE_ENV=production
```

### Key Configuration Areas
- `CONFIG.DISTANCE_LIMITS` - Distance limits by transport mode
- `CONFIG.SPEEDS` - Average speeds for duration calculation  
- `CONFIG.POI.CATEGORIES` - POI types and search queries
- `CONFIG.ROUTE_GENERATION` - Algorithm parameters and tolerances
- `CONFIG.UI.BREAKPOINTS` - Responsive design breakpoints

## Development Workflow

### Adding New Features (MOBILE-FIRST MANDATORY)
1. **DESIGN FOR MOBILE FIRST** - Never start with desktop approach
2. Update `assets/js/config.js` with new constants
3. Extend appropriate module in `assets/js/modules/`
4. Update `UIManager.js` if UI changes needed
5. **Test exclusively on mobile/small screen FIRST AND ONLY**
6. Ensure touch events work properly with `stopPropagation()`
7. **NO DESKTOP TESTING until mobile is perfect**

### Mobile Testing Requirements (MANDATORY PROCESS)
- **MANDATORY**: Always test on actual mobile device or browser DevTools mobile view FIRST
- **NO EXCEPTION**: Never test on desktop first - mobile is the primary and only initial target
- Verify touch targets are minimum 44px
- Check that animations are smooth (use `cubic-bezier` timing)
- Ensure panels open/close properly without event conflicts
- **ONLY after mobile perfection** - consider desktop compatibility as secondary

### Debugging Tools
```javascript
// Global app state inspection
window.makeMyWayApp.getState()

// API cache statistics  
window.makeMyWayApp.modules.apiService.getCacheStats()

// Current user info
window.makeMyWayApp.getCurrentUser()
```

## Common Issues

### Double Animation Bug
- **Problem**: Panel opens twice on mobile touch
- **Solution**: Use `touchstart` events only, add `stopPropagation()`, avoid mixing click/touch handlers

### CORS Issues
- Backend has permissive CORS for development
- Render.com deployment handles production CORS automatically

### Google Maps API Limits
- Backend proxies Google APIs to hide API keys
- Implements rate limiting and error handling
- Uses intelligent caching to reduce API calls

## File Architecture Notes

### CSS Organization
- `assets/css/main.css` - Global styles and CSS variables
- `assets/css/components/` - Component-specific styles
- `assets/css/components/floating-search.css` - Mobile-first floating interface

### JavaScript Modules
- ES6 imports/exports throughout
- No build process - served directly to browser
- Dependency injection pattern for testability
- Service layer separation (ApiService, AuthService)

### Backend API Design
- RESTful routes with consistent JSON responses
- JWT authentication with 7-day token expiry
- Input validation and error handling on all routes
- MongoDB integration with Mongoose ODM

The codebase prioritizes mobile-first development, modular architecture, and robust error handling while maintaining simplicity without unnecessary build complexity.