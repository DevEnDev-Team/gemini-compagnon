import { useState, useEffect, useRef } from 'react';
import { Plus, Folder, Bot, X, Sun, Moon, CornerDownRight, ChevronUp, Copy, Check } from 'lucide-react';
import { listDirectories } from '../api';
import type { Project } from '../api';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string, path: string) => void;
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
  isOpen, 
  onClose,
  theme,
  onToggleTheme
}: SidebarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
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
      onAddProject(newName, newPath);
      setIsModalOpen(false);
      setNewName('');
      setNewPath('');
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
        // Fallback for non-secure contexts or older browsers
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
            projects.map((p) => (
              <div 
                key={p.id} 
                className={`project-item ${p.id === activeProjectId ? 'active' : ''}`}
                onClick={() => {
                  onSelectProject(p.id);
                  onClose();
                }}
              >
                <Folder size={18} className="project-icon" />
                <div className="project-info">
                  <span className="name">{p.name}</span>
                  <span className="path">{p.path}</span>
                </div>
                <button 
                  className="copy-path-btn" 
                  onClick={(e) => handleCopyPath(e, p.path, p.id)}
                  title="Copier le chemin"
                >
                  {copiedId === p.id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                </button>
              </div>
            ))
          )}
        </div>

        <button className="add-project-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Ajouter un projet</span>
        </button>
      </aside>

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
    </>
  );
}
