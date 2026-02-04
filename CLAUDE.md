# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YoutubeDL-Material is a Material Design web application for downloading videos from YouTube and other platforms. It consists of:
- **Frontend**: Angular 15 (TypeScript) with Angular Material
- **Backend**: Node.js/Express.js REST API
- **Database**: LowDB (JSON-based) or MongoDB for scaling

## Common Commands

### Development Setup (First Time)
```bash
npm install                    # Install frontend dependencies
cd backend && npm install      # Install backend dependencies
cd ..
npm run build                  # Build frontend (outputs to backend/public/)
```

### Running the Application
```bash
cd backend && npm start        # Start backend with PM2 (serves frontend too)
# Visit http://localhost:17442
```

### Running Tests
```bash
npm test                       # Frontend Karma/Jasmine tests
cd backend && npm test         # Backend Mocha tests
```

### Linting
```bash
npm run lint                   # ESLint for frontend
```

### Building
```bash
npm run build                  # Production build of frontend
```

### Debug Mode
Set `YTDL_MODE=debug` environment variable to use `src/assets/default.json` instead of `backend/appdata/default.json`. In VS Code, use the "Dev: Debug Backend" launch configuration.

## Architecture

### Directory Structure
- `src/` - Angular frontend application
  - `src/app/components/` - Feature components
  - `src/app/dialogs/` - Dialog components
  - `src/app/posts.services.ts` - Main API service (all HTTP calls to backend)
- `backend/` - Node.js Express server
  - `backend/app.js` - Main Express app with 100+ API endpoints
  - `backend/downloader.js` - Download queue management
  - `backend/db.js` - Database abstraction (LowDB/MongoDB)
  - `backend/subscriptions.js` - Subscription management
  - `backend/authentication/` - Passport.js auth strategies
  - `backend/appdata/` - Runtime config and database files

### Key Patterns
- Frontend communicates exclusively via REST API (`/api/*` endpoints)
- Download queue uses a 4-step state machine: create → collect info → download → complete
- Authentication supports local, JWT, and LDAP via Passport.js
- Multi-user support with role-based access control

### Configuration
- Production config: `backend/appdata/default.json`
- Development config: `src/assets/default.json` (when `YTDL_MODE=debug`)
- Default port: 17442

## External Dependencies
- FFmpeg (video/audio processing)
- youtube-dl/yt-dlp (downloading)
- Python (required by youtube-dl)
- Optional: AtomicParsley (thumbnail embedding), MongoDB (scaling)

## Docker Development & Testing

**IMPORTANT: Always use Docker to build and test this application.**

### Docker Test Environment

Create a test docker-compose file (`docker-compose.test.yml`) to test changes without affecting production:

```yaml
version: "2"
services:
    ytdl-material-test:
        build: .
        container_name: ytdl-material-export-test
        environment:
            ytdl_use_local_db: 'true'
            write_ytdl_config: 'true'
        restart: unless-stopped
        volumes:
            - ./test-appdata:/app/appdata
            - ./test-audio:/app/audio
            - ./test-video:/app/video
            - ./test-exports:/app/exports
        ports:
            - "17443:17442"
```

### Building and Testing with Docker

```bash
# Build the Docker image
docker build -t ytdl-material-test .

# Start test container
docker-compose -f docker-compose.test.yml up -d

# View logs
docker logs -f ytdl-material-export-test

# Stop and remove test container
docker-compose -f docker-compose.test.yml down

# Test the API (use admin_token from backend/app.js for authentication)
curl "http://localhost:17443/api/config?apiKey=<admin_token>"
```

### API Authentication for Testing

The API requires authentication. Use the `apiKey` query parameter with the admin token found in `backend/app.js` (search for `admin_token`).

Example:
```bash
curl "http://localhost:17443/api/tomp3?apiKey=4241b401-7236-493e-92b5-b72696b9d853&url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### Port Allocation
- **17442**: Production (do not use for testing)
- **17443**: Testing/Development

### Testing the Export Feature

1. **Build and start the test container:**
   ```bash
   docker compose -f docker-compose.test.yml build
   docker compose -f docker-compose.test.yml up -d
   ```

2. **Enable export feature via API:**
   ```bash
   curl -s -X POST "http://localhost:17443/api/setConfig?apiKey=4241b401-7236-493e-92b5-b72696b9d853" \
     -H "Content-Type: application/json" \
     -d '{"new_config_file":{"YoutubeDLMaterial":{...,"Export":{"enable_export_folder":true,"export_folder_path":"exports/","export_folder_naming":"original","export_include_nfo":true,"custom_export_folder_template":"","export_use_simple_filenames":false}}}}'
   ```

3. **Download a test video:**
   ```bash
   curl -s -X POST "http://localhost:17443/api/downloadFile?apiKey=4241b401-7236-493e-92b5-b72696b9d853" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://www.youtube.com/watch?v=jNQXAC9IVRw","type":"video"}'
   ```

4. **Check the export folder:**
   ```bash
   ls -laR test-exports/
   ```

5. **Verify logs show export messages:**
   ```bash
   docker logs ytdl-material-export-test 2>&1 | grep "Exported"
   ```

6. **Test different naming conventions:**
   - `original`: Folder name matches video title
   - `snake_case`: Lowercase with underscores (e.g., `my_video_title`)
   - `kebab_case`: Lowercase with hyphens (e.g., `my-video-title`)
   - `custom`: Use template with placeholders `{title}`, `{uploader}`, `{channel}`, `{upload_date}`, `{id}`, `{extractor}`

7. **Test simplified filenames:**
   Set `export_use_simple_filenames: true` to use `video.mp4`, `video.nfo` instead of original filenames.

8. **Cleanup:**
   ```bash
   docker compose -f docker-compose.test.yml down
   rm -rf test-appdata test-audio test-video test-exports
   ```
