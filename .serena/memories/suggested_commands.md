# Suggested Development Commands

## Backend Development

### Setup
```bash
cd backend
pip install -r requirements.txt
```

### Running the Backend Server
```bash
cd backend
uvicorn main:app --reload
```
- Runs on default port (8000)
- Auto-reloads on code changes

## Frontend Development

### Setup
```bash
cd frontend
npm install --legacy-peer-deps
```
Note: `--legacy-peer-deps` is required due to react-tinder-card peer dependencies with React 19

### Running the Development Server
```bash
cd frontend
npm run dev
```
- Runs on port 5173 (default Vite port)

### Building for Production
```bash
cd frontend
npm run build
```

### Preview Production Build
```bash
cd frontend
npm run preview
```

### Linting
```bash
cd frontend
npm run lint
```

## Environment Configuration

### Create .env file in root directory
```bash
GOOGLE_API_KEY=your_api_key_here
```

## Common System Commands (macOS/Darwin)

### File Operations
- `ls` - List files and directories
- `cd` - Change directory
- `pwd` - Print working directory
- `cat` - Display file contents
- `grep` - Search text patterns
- `find` - Find files

### Git Operations
- `git status` - Check repository status
- `git add .` - Stage all changes
- `git commit -m "message"` - Commit changes
- `git push` - Push to remote
- `git pull` - Pull from remote
- `git log` - View commit history

### Process Management
- `ps aux | grep uvicorn` - Find running uvicorn processes
- `ps aux | grep vite` - Find running vite processes
- `kill -9 <PID>` - Force kill a process
