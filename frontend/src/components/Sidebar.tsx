import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Folder, Bot, X, Sun, Moon, CornerDownRight, 
  ChevronUp, ChevronDown, Copy, Check, Trash2, Code, Globe, 
  Database, Cpu, Layers, Settings, Terminal, Cloud, Edit2
} from 'lucide-react';
import { listDirectories } from '../api';
import type { Project } from '../api';

const AVAILABLE_ICONS = {
  Bot: Bot,
  Folder: Folder,
  Code: Code,
  Globe: Globe,
  Database: Database,
  Cpu: Cpu,
  Layers: Layers,
  Settings: Settings,
  Terminal: Terminal,
  Cloud: Cloud,
};

interface SidebarProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string, path: string, icon?: string) => void;
  onDeleteProject: (id: string) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onReorderProjects: (ids: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Sidebar({ 
  projects, 
  activeProjectId, 
  onSelectProject, 
  onAddProject,
  onDeleteProject,
  onUpdateProject,
  onReorderProjects,
  isOpen, 
  onClose,
  theme,
  onToggleTheme
}: SidebarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newProjects = [...projects];
    const item = newProjects.splice(draggedIndex, 1)[0];
    newProjects.splice(index, 0, item);
    
    onReorderProjects(newProjects.map(p => p.id));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const [newIcon, setNewIcon] = useState<keyof typeof AVAILABLE_ICONS>('Folder');
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [parentPath, setParentPath] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const data = await listDirectories(newPath || undefined);
        setSuggestions(data.directories);
        setParentPath(data.parentPath);
        setCurrentPath(data.currentPath);
        if (newPath) setShowSuggestions(true);
      } catch (e) {
        setSuggestions([]);
      }
    };

    if (newPath) {
      const timeoutId = setTimeout(fetchSuggestions, 300);
      return () => clearTimeout(timeoutId);
    } else if (isModalOpen) {
      fetchSuggestions();
    }
  }, [newPath, isModalOpen]);

  const handleAdd = () => {
    if (newName && newPath) {
      onAddProject(newName, newPath, newIcon);
      setIsModalOpen(false);
      setNewName('');
      setNewPath('');
      setNewIcon('Folder');
    }
  };

  const handleUpdate = () => {
    if (editingProject && newName) {
      onUpdateProject(editingProject.id, { name: newName, icon: newIcon });
      setIsEditModalOpen(false);
      setEditingProject(null);
      setNewName('');
      setNewIcon('Folder');
    }
  };

  const handleMoveUp = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index > 0) {
      const newProjects = [...projects];
      const temp = newProjects[index];
      newProjects[index] = newProjects[index - 1];
      newProjects[index - 1] = temp;
      onReorderProjects(newProjects.map(p => p.id));
    }
  };

  const handleMoveDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index < projects.length - 1) {
      const newProjects = [...projects];
      const temp = newProjects[index];
      newProjects[index] = newProjects[index + 1];
      newProjects[index + 1] = temp;
      onReorderProjects(newProjects.map(p => p.id));
    }
  };

  const openEditModal = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProject(project);
    setNewName(project.name);
    setNewIcon((project.icon as keyof typeof AVAILABLE_ICONS) || 'Folder');
    setIsEditModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Es-tu sûr de vouloir supprimer le projet "${name}" de la liste ? (Les fichiers ne seront pas supprimés)`)) {
      onDeleteProject(id);
    }
  };

  const selectSuggestion = (dir: string) => {
    const separator = currentPath.includes('\\') ? '\\' : '/';
    const base = currentPath.endsWith(separator) ? currentPath : currentPath + separator;
    setNewPath(base + dir);
    setShowSuggestions(false);
  };

  const goUp = () => {
    setNewPath(parentPath);
    setShowSuggestions(false);
  };

  const handleCopyPath = async (e: React.MouseEvent, path: string, id: string) => {
    e.stopPropagation();
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(path);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = path;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie :', err);
    }
  };

  const renderIcon = (iconName?: string, size = 18, className = "project-icon") => {
    const IconComponent = AVAILABLE_ICONS[iconName as keyof typeof AVAILABLE_ICONS] || Folder;
    return <IconComponent size={size} className={className} />;
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Bot size={20} className="text-primary" />
          <h2>Mes Projets</h2>
          <div className="header-actions">
            <button className="theme-toggle-btn" onClick={onToggleTheme} aria-label="Changer de thème">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="close-btn" onClick={onClose} aria-label="Fermer le menu">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="project-list">
          {projects.length === 0 ? (
            <div className="empty-projects">
              <p>Aucun projet configuré</p>
            </div>
          ) : (
            projects.map((p, index) => (
              <div 
                key={p.id} 
                className={`project-item ${p.id === activeProjectId ? 'active' : ''} ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                onClick={() => {
                  onSelectProject(p.id);
                  onClose();
                }}
                draggable="true"
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDrop={() => handleDrop(index)}
              >
                <div className="reorder-actions">
                  <button 
                    className={`reorder-btn ${index === 0 ? 'disabled' : ''}`} 
                    onClick={(e) => handleMoveUp(e, index)}
                    disabled={index === 0}
                    title="Monter"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button 
                    className={`reorder-btn ${index === projects.length - 1 ? 'disabled' : ''}`} 
                    onClick={(e) => handleMoveDown(e, index)}
                    disabled={index === projects.length - 1}
                    title="Descendre"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <button 
                  type="button"
                  className="project-icon-btn"
                  onClick={(e) => openEditModal(e, p)}
                  title="Changer l'icône"
                >
                  {renderIcon(p.icon)}
                </button>
                <div className="project-info">
                  <span className="name">{p.name}</span>
                  <span className="path">{p.path}</span>
                </div>
                <div className="project-actions">
                  <button 
                    className="action-btn" 
                    onClick={(e) => handleCopyPath(e, p.path, p.id)}
                    title="Copier le chemin"
                  >
                    {copiedId === p.id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  </button>
                  <button 
                    className="action-btn" 
                    onClick={(e) => openEditModal(e, p)}
                    title="Modifier l'icône"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    className="action-btn delete" 
                    onClick={(e) => handleDelete(e, p.id, p.name)}
                    title="Supprimer du menu"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button className="add-project-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Ajouter un projet</span>
        </button>
      </aside>

      {/* Modal Nouveau Projet */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Nouveau Projet</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Icône du projet</label>
                <div className="icon-selector">
                  {Object.entries(AVAILABLE_ICONS).map(([name, Icon]) => (
                    <button 
                      key={name}
                      type="button"
                      className={`icon-option ${newIcon === name ? 'active' : ''}`}
                      onClick={() => setNewIcon(name as keyof typeof AVAILABLE_ICONS)}
                    >
                      <Icon size={20} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Nom du projet</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  placeholder="Ex: Mon Super Projet"
                  autoFocus
                />
              </div>
              <div className="form-group" ref={suggestionRef}>
                <label>Chemin du dossier</label>
                <input 
                  type="text" 
                  value={newPath} 
                  onChange={(e) => setNewPath(e.target.value)} 
                  placeholder="Ex: /home/user/projets/mon-projet"
                  onFocus={() => setShowSuggestions(true)}
                />
                {showSuggestions && (suggestions.length > 0 || parentPath) && (
                  <div className="autocomplete-suggestions">
                    {parentPath && parentPath !== newPath && (
                      <div className="suggestion-item parent" onClick={goUp}>
                        <ChevronUp size={14} />
                        <span>Dossier parent ({parentPath})</span>
                      </div>
                    )}
                    {suggestions.map((dir) => (
                      <div key={dir} className="suggestion-item" onClick={() => selectSuggestion(dir)}>
                        <CornerDownRight size={14} />
                        <span>{dir}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Annuler</button>
              <button 
                className="btn-submit" 
                onClick={handleAdd}
                disabled={!newName || !newPath}
              >
                Créer le projet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edition Projet (Icône/Nom) */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Modifier le projet</h3>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Icône du projet</label>
                <div className="icon-selector">
                  {Object.entries(AVAILABLE_ICONS).map(([name, Icon]) => (
                    <button 
                      key={name}
                      type="button"
                      className={`icon-option ${newIcon === name ? 'active' : ''}`}
                      onClick={() => setNewIcon(name as keyof typeof AVAILABLE_ICONS)}
                    >
                      <Icon size={20} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Nom du projet</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  placeholder="Nom du projet"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setIsEditModalOpen(false)}>Annuler</button>
              <button 
                className="btn-submit" 
                onClick={handleUpdate}
                disabled={!newName}
              >
                Mettre à jour
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
