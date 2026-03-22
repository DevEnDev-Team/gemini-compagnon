import { spawn } from 'child_process';
import type { ChildProcessByStdio } from 'child_process';
import { Server } from 'socket.io';
import fs from 'fs/promises';
import path from 'path';
import type { Writable, Readable } from 'stream';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const HISTORY_DIR = path.join(process.cwd(), 'data', 'history');
const GEMINI_PATH = '/home/mangoz404/.nvm/versions/node/v22.17.1/bin/gemini';

export class ProjectSession {
  private activeProcess: ChildProcessByStdio<Writable, Readable, Readable> | null = null;
  private history: Message[] = [];
  private historyFile: string;
  private terminalLog: string = '';
  private isRunning: boolean = false;
  private currentPrompt: string | null = null;
  private pendingNotification: boolean = false;

  constructor(
    private projectId: string,
    private projectPath: string,
    private io: Server
  ) {
    this.historyFile = path.join(HISTORY_DIR, `${this.projectId}.json`);
  }

  getState() {
    return {
      projectId: this.projectId,
      isRunning: this.isRunning,
      terminalLog: this.terminalLog,
      pendingPrompt: this.currentPrompt,
      pendingNotification: this.pendingNotification
    };
  }

  clearNotification() {
    this.pendingNotification = false;
  }

  async loadHistory() {
    try {
      await fs.mkdir(HISTORY_DIR, { recursive: true });
      const data = await fs.readFile(this.historyFile, 'utf-8');
      this.history = JSON.parse(data);
    } catch (error) {
      this.history = [];
    }
    return this.history;
  }

  async saveHistory() {
    await fs.writeFile(this.historyFile, JSON.stringify(this.history, null, 2));
  }

  async ask(message: string) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.terminalLog = '';
    this.currentPrompt = null;
    
    const userMsg: Message = { role: 'user', text: message, timestamp: new Date().toISOString() };
    this.history.push(userMsg);
    await this.saveHistory();

    // Broadcast to the room (all clients in this project)
    this.io.to(this.projectId).emit('output:start', { projectId: this.projectId });

    const args = ['-p', `${message} (Réponds toujours en français.)`, '--output-format', 'json', '--approval-mode', 'yolo'];
    
    this.activeProcess = spawn(GEMINI_PATH, args, {
      cwd: this.projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let fullOutput = '';

    this.activeProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      fullOutput += chunk;
      this.terminalLog += chunk;
      this.io.to(this.projectId).emit('output:chunk', { projectId: this.projectId, data: chunk });
      
      if (chunk.includes('[y/N]') || chunk.includes('Confirm?')) {
        this.currentPrompt = chunk.trim();
        this.io.to(this.projectId).emit('prompt:required', { projectId: this.projectId, text: this.currentPrompt });
      }
    });

    this.activeProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      this.terminalLog += chunk;
      this.io.to(this.projectId).emit('output:chunk', { projectId: this.projectId, data: chunk });
    });

    this.activeProcess.on('close', async () => {
      this.isRunning = false;
      this.currentPrompt = null;
      this.pendingNotification = true;
      let responseText = '';
      
      try {
        const result = JSON.parse(fullOutput);
        responseText = result.response || result.text || fullOutput;
      } catch (e) {
        responseText = fullOutput.trim() || 'Processus terminé.';
      }

      const assistantMsg: Message = { 
        role: 'assistant', 
        text: responseText, 
        timestamp: new Date().toISOString() 
      };
      
      this.history.push(assistantMsg);
      await this.saveHistory();
      
      this.io.to(this.projectId).emit('output:done', { 
        projectId: this.projectId, 
        response: responseText,
        history: this.history 
      });
      
      this.activeProcess = null;
    });
  }

  sendInput(data: string) {
    if (this.activeProcess && this.activeProcess.stdin) {
      this.activeProcess.stdin.write(data + '\n');
      this.currentPrompt = null;
    }
  }
}
