import fs from 'fs/promises';
import path from 'path';

export interface Project {
  id: string;
  name: string;
  path: string;
}

const PROJECTS_FILE = path.join(process.cwd(), 'data', 'projects.json');

export class ProjectManager {
  private projects: Project[] = [];

  async load() {
    try {
      const data = await fs.readFile(PROJECTS_FILE, 'utf-8');
      this.projects = JSON.parse(data);
    } catch (error) {
      console.warn('Could not load projects.json, using default');
      this.projects = [
        { id: 'default', name: 'geminiCompagnon', path: process.cwd().replace('/backend', '') }
      ];
      await this.save();
    }
  }

  async save() {
    await fs.mkdir(path.dirname(PROJECTS_FILE), { recursive: true });
    await fs.writeFile(PROJECTS_FILE, JSON.stringify(this.projects, null, 2));
  }

  getProjects() {
    return this.projects;
  }

  getProject(id: string) {
    return this.projects.find(p => p.id === id);
  }

  async addProject(name: string, folderPath: string) {
    try {
      const stats = await fs.stat(folderPath);
      if (!stats.isDirectory()) {
        throw new Error('Le chemin spécifié n\'est pas un dossier.');
      }
    } catch (error) {
      throw new Error(`Le dossier "${folderPath}" n'existe pas ou n'est pas accessible.`);
    }

    const id = name.toLowerCase().replace(/\s+/g, '-');
    const newProject = { id, name, path: folderPath };
    this.projects.push(newProject);
    await this.save();
    return newProject;
  }
}
