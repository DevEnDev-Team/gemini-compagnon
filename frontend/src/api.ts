import { io, Socket } from 'socket.io-client';

export interface Project {
  id: string;
  name: string;
  path: string;
}

export interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ProjectState {
  projectId: string;
  isRunning: boolean;
  terminalLog: string;
  pendingPrompt: string | null;
  pendingNotification: boolean;
}

const API_BASE_URL = 'http://' + window.location.hostname + ':3001';
const API_KEY = 'default-secret';

export let socket: Socket;

export function initSocket() {
  if (!socket) {
    socket = io(API_BASE_URL);
  }
  return socket;
}

export async function getProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE_URL}/projects`);
  return response.json();
}

export async function getProjectHistory(projectId: string): Promise<Message[]> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/history`);
  return response.json();
}

export async function getProjectState(projectId: string): Promise<ProjectState> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/state`);
  return response.json();
}

export async function clearProjectNotification(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/clear-notification`, {
    method: 'POST'
  });
  return response.json();
}

export async function listDirectories(path?: string): Promise<{ currentPath: string; parentPath: string; directories: string[] }> {
  const url = path ? `${API_BASE_URL}/fs/list?path=${encodeURIComponent(path)}` : `${API_BASE_URL}/fs/list`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur lors de la récupération des dossiers');
  }
  return data;
}

export async function addProject(name: string, path: string): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, path }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur lors de l\'ajout du projet');
  }
  return data;
}

export function joinProject(projectId: string) {
  if (!socket) initSocket();
  socket.emit('project:join', projectId);
}

export function sendChatMessage(projectId: string, message: string) {
  if (!socket) initSocket();
  socket.emit('chat:message', { projectId, message, key: API_KEY });
}

export function sendTerminalInput(projectId: string, input: string) {
  if (!socket) initSocket();
  socket.emit('chat:input', { projectId, input });
}
