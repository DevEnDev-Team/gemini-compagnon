import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProjectManager } from './src/lib/ProjectManager.js';
import { ProjectSession } from './src/lib/Session.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
  }
});

const port = Number(process.env.PORT) || 3001;
const apiKey = process.env.API_KEY || 'default-secret';

app.use(cors());
app.use(express.json());

const projectManager = new ProjectManager();
const activeSessions: Map<string, ProjectSession> = new Map();

async function getSession(projectId: string): Promise<ProjectSession | null> {
  const project = projectManager.getProject(projectId);
  if (!project) return null;
  
  if (!activeSessions.has(project.id)) {
    activeSessions.set(project.id, new ProjectSession(project.id, project.path, io));
    await activeSessions.get(project.id)!.loadHistory();
  }
  return activeSessions.get(project.id)!;
}

async function init() {
  await projectManager.load();
  console.log(`Loaded ${projectManager.getProjects().length} projects.`);
}

init();

// --- Projects Router ---
const projectRouter = express.Router();

projectRouter.get('/', async (req, res) => {
  try {
    res.json(projectManager.getProjects());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

projectRouter.post('/reorder', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Un tableau d\'IDs est requis.' });
    }
    const projects = await projectManager.reorderProjects(ids);
    res.json(projects);
  } catch (error: any) {
    console.error('Error reordering projects:', error);
    res.status(500).json({ error: error.message });
  }
});

projectRouter.post('/', async (req, res) => {
  const { name, path: folderPath, icon } = req.body;
  if (!name || !folderPath) return res.status(400).json({ error: 'Le nom et le chemin sont requis.' });
  try {
    const project = await projectManager.addProject(name, folderPath, icon);
    res.json(project);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

projectRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await projectManager.deleteProject(id);
    if (deleted) {
      activeSessions.delete(id);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Projet non trouvé.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

projectRouter.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await projectManager.updateProject(id, req.body);
    if (project) {
      res.json(project);
    } else {
      res.status(404).json({ error: 'Projet non trouvé.' });
    }
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
});

projectRouter.get('/:id/history', async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Project not found' });
    const history = await session.loadHistory();
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

projectRouter.get('/:id/state', async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Project not found' });
    res.json(session.getState());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

projectRouter.post('/:id/clear-notification', async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Project not found' });
    session.clearNotification();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// JSON 404 for project routes
projectRouter.use((req, res) => {
  res.status(404).json({ error: `Route API Projets non trouvée : ${req.method} ${req.originalUrl}` });
});

// --- FS Router ---
const fsRouter = express.Router();

fsRouter.get('/list', async (req, res) => {
  const queryPath = (req.query.path as string) || process.cwd();
  try {
    const absolutePath = path.isAbsolute(queryPath) ? queryPath : path.resolve(process.cwd(), queryPath);
    const files = await fs.readdir(absolutePath, { withFileTypes: true });
    const directories = files
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    res.json({
      currentPath: absolutePath,
      parentPath: path.dirname(absolutePath),
      directories: directories.sort()
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// JSON 404 for FS routes
fsRouter.use((req, res) => {
  res.status(404).json({ error: `Route API FS non trouvée : ${req.method} ${req.originalUrl}` });
});

// Mounting routers
app.use('/projects', projectRouter);
app.use('/fs', fsRouter);

// Socket.io handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('project:join', async (projectId) => {
    socket.join(projectId);
    const session = await getSession(projectId);
    if (session) {
      socket.emit('project:state', session.getState());
    }
  });

  socket.on('chat:message', async (data) => {
    const { projectId, message, key } = data;
    if (key !== apiKey) return socket.emit('error', { message: 'Unauthorized' });

    const session = await getSession(projectId);
    if (!session) return socket.emit('error', { message: 'Project not found' });

    await session.ask(message);
  });

  socket.on('chat:input', async (data) => {
    const { projectId, input } = data;
    const session = await getSession(projectId);
    if (session) {
      session.sendInput(input);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Serve frontend in production
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

// SPA fallback for all other GET requests (ONLY for non-API routes)
app.get('*path', (req, res, next) => {
  if (!req.path.startsWith('/projects') && !req.path.startsWith('/fs')) {
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
      if (err) {
        // Fallback if index.html is missing
        next();
      }
    });
  } else {
    next();
  }
});

// General 404 handler for EVERYTHING else
app.use((req, res) => {
  if (req.accepts('json') || req.path.startsWith('/projects') || req.path.startsWith('/fs')) {
    res.status(404).json({ error: `Route non trouvée : ${req.method} ${req.originalUrl}` });
  } else {
    res.status(404).send('Not Found');
  }
});

// General error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Une erreur interne est survenue sur le serveur.' });
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Server v2.2 running on http://0.0.0.0:${port}`);
});
