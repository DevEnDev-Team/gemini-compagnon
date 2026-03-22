import { io, Socket } from 'socket.io-client';

export interface Project {
  id: string;
  name: string;
  path: string;
  icon?: string;
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

const API_BASE_URL = ''; // Relative paths (works with Vite proxy or Express serving)
const API_KEY = 'default-secret';

export let socket: Socket;

export function initSocket() {
  if (!socket) {
    socket = io();
  }
  return socket;
}

async function handleResponse(response: Response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Erreur ${response.status}`);
    }
    return data;
  } else {
    // Non-JSON response (likely HTML error page)
    const text = await response.text();
    if (!response.ok) {
      if (text.includes('<!DOCTYPE html>')) {
        throw new Error(`Erreur serveur (HTML) : ${response.status} ${response.statusText}. La route API n'est peut-être pas trouvée.`);
      }
      throw new Error(`Erreur serveur : ${response.status} ${response.statusText}`);
    }
    return text;
  }
}

export async function getProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE_URL}/projects`);
  return handleResponse(response);
}

export async function getProjectHistory(projectId: string): Promise<Message[]> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/history`);
  return handleResponse(response);
}

export async function getProjectState(projectId: string): Promise<ProjectState> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/state`);
  return handleResponse(response);
}

export async function clearProjectNotification(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/clear-notification`, {
    method: 'POST'
  });
  return handleResponse(response);
}

export async function listDirectories(path?: string): Promise<{ currentPath: string; parentPath: string; directories: string[] }> {
  const url = path ? `${API_BASE_URL}/fs/list?path=${encodeURIComponent(path)}` : `${API_BASE_URL}/fs/list`;
  const response = await fetch(url);
  return handleResponse(response);
}

export async function addProject(name: string, path: string, icon?: string): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, path, icon }),
  });
  return handleResponse(response);
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: 'DELETE'
  });
  return handleResponse(response);
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse(response);
}

export async function reorderProjects(ids: string[]): Promise<Project[]> {
  const response = await fetch(`${API_BASE_URL}/projects/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  return handleResponse(response);
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
