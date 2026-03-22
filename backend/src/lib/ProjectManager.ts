import fs from 'fs/promises';
import path from 'path';

export interface Project {
  id: string;
  name: string;
  path: string;
  icon?: string;
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
        { id: 'default', name: 'geminiCompagnon', path: process.cwd().replace('/backend', ''), icon: 'Bot' }
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

  async addProject(name: string, folderPath: string, icon?: string) {
    try {
      const stats = await fs.stat(folderPath);
      if (!stats.isDirectory()) {
        throw new Error('Le chemin spécifié n\'est pas un dossier.');
      }
    } catch (error) {
      throw new Error(`Le dossier "${folderPath}" n'existe pas ou n'est pas accessible.`);
    }

    const id = name.toLowerCase().replace(/\s+/g, '-');
    const newProject = { id, name, path: folderPath, icon: icon || 'Folder' };
    this.projects.push(newProject);
    await this.save();
    return newProject;
  }

  async deleteProject(id: string) {
    const initialLength = this.projects.length;
    this.projects = this.projects.filter(p => p.id !== id);
    if (this.projects.length !== initialLength) {
      await this.save();
      return true;
    }
    return false;
  }

  async updateProject(id: string, updates: Partial<Project>) {
    const index = this.projects.findIndex(p => p.id === id);
    if (index !== -1) {
      // We ensure the ID remains the same by spreading updates after the current project,
      // and then forcing the ID back if necessary, but spreading ensures the correct result.
      // TypeScript is just being strict about the Partial type.
      this.projects[index] = { ...this.projects[index], ...updates, id } as Project;
      await this.save();
      return this.projects[index];
    }
    return null;
  }

  async reorderProjects(ids: string[]) {
    const reordered: Project[] = [];
    for (const id of ids) {
      const project = this.projects.find(p => p.id === id);
      if (project) {
        reordered.push(project);
      }
    }
    
    // Add any projects that might have been missing from the IDs list (safety)
    for (const project of this.projects) {
      if (!reordered.find(p => p.id === project.id)) {
        reordered.push(project);
      }
    }

    this.projects = reordered;
    await this.save();
    return this.projects;
  }
}
