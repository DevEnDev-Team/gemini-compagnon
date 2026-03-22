import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { ProjectManager } from './src/lib/ProjectManager.js';
import { ProjectSession } from './src/lib/Session.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const port = Number(process.env.PORT) || 3001;
const apiKey = process.env.API_KEY || 'default-secret';

app.use(cors());
app.use(bodyParser.json());

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

// API Endpoints
app.get('/projects', (req, res) => {
  res.json(projectManager.getProjects());
});

app.post('/projects', async (req, res) => {
  const { name, path } = req.body;
  if (!name || !path) return res.status(400).json({ error: 'Le nom et le chemin sont requis.' });
  try {
    const project = await projectManager.addProject(name, path);
    res.json(project);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/fs/list', async (req, res) => {
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

app.get('/projects/:id/history', async (req, res) => {
  const session = await getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Project not found' });
  const history = await session.loadHistory();
  res.json(history);
});

app.get('/projects/:id/state', async (req, res) => {
  const session = await getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Project not found' });
  res.json(session.getState());
});

app.post('/projects/:id/clear-notification', async (req, res) => {
  const session = await getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Project not found' });
  session.clearNotification();
  res.json({ success: true });
});

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

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Server v2.1 running on http://0.0.0.0:${port}`);
});
