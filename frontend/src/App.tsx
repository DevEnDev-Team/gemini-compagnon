import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Menu, Check, X as Close, Trash2, Bot, Folder, Code, Globe, Database, Cpu, Layers, Settings, Terminal as TerminalIcon, Cloud } from 'lucide-react';
import { 
  initSocket, 
  getProjects, 
  getProjectHistory, 
  getProjectState,
  addProject, 
  deleteProject,
  updateProject,
  reorderProjects,
  sendChatMessage, 
  sendTerminalInput,
  joinProject,
  clearProjectNotification
} from './api';
import type { Project, Message, ProjectState } from './api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sidebar } from './components/Sidebar';
import { Terminal } from './components/Terminal';
import './App.css';

const AVAILABLE_ICONS = {
  Bot: Bot,
  Folder: Folder,
  Code: Code,
  Globe: Globe,
  Database: Database,
  Cpu: Cpu,
  Layers: Layers,
  Settings: Settings,
  Terminal: TerminalIcon,
  Cloud: Cloud,
};

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return localStorage.getItem('lastProjectId') || '';
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [clearedAtMap, setClearedAtMap] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem('clearedAtMap');
    return stored ? JSON.parse(stored) : {};
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const showNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: '/favicon.svg' });
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('clearedAtMap', JSON.stringify(clearedAtMap));
  }, [clearedAtMap]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleClear = () => {
    if (!activeProjectId) return;
    setClearedAtMap(prev => ({
      ...prev,
      [activeProjectId]: new Date().toISOString()
    }));
  };

  const displayedMessages = messages.filter(msg => {
    const clearedAt = clearedAtMap[activeProjectId];
    if (!clearedAt) return true;
    return new Date(msg.timestamp) > new Date(clearedAt);
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loadInitialData = async () => {
    const projs = await getProjects();
    setProjects(projs);

    // Check all projects for pending notifications
    for (const p of projs) {
      const state = await getProjectState(p.id);
      if (state.pendingNotification) {
        showNotification(p.name, "Une tâche s'est terminée pendant ton absence.");
        await clearProjectNotification(p.id);
      }
    }

    if (projs.length > 0) {
      const lastId = localStorage.getItem('lastProjectId');
      const idToSelect = (lastId && projs.find(p => p.id === lastId)) ? lastId : projs[0].id;
      handleProjectSelect(idToSelect);
    }
  };

  const loadProjectData = async (projectId: string) => {
    const history = await getProjectHistory(projectId);
    setMessages(history);
    const state = await getProjectState(projectId);
    setTerminalOutput(state.terminalLog);
    setIsLoading(state.isRunning);
    setPendingPrompt(state.pendingPrompt);

    if (state.pendingNotification) {
      const projectName = projects.find(p => p.id === projectId)?.name || 'Gemini Compagnon';
      showNotification(projectName, "Une tâche s'est terminée pendant ton absence.");
      await clearProjectNotification(projectId);
    }

    joinProject(projectId);
    scrollToBottom();
  };

  useEffect(() => {
    loadInitialData();
  }, []); // Only on mount

  useEffect(() => {
    const socket = initSocket();

    socket.on('output:start', () => {
      setTerminalOutput('');
      setStreamingMessage('');
      setIsLoading(true);
      setIsTerminalOpen(true);
    });

    socket.on('output:chunk', (data: { projectId: string; data: string }) => {
      if (data.projectId === activeProjectId) {
        setTerminalOutput((prev) => prev + data.data);
        setStreamingMessage((prev) => (prev !== null ? prev + data.data : data.data));
        scrollToBottom();
      }
    });

    socket.on('output:done', async (data: { projectId: string; history: Message[] }) => {
      if (data.projectId === activeProjectId) {
        setMessages(data.history);
        setStreamingMessage(null);
        setIsLoading(false);
        setPendingPrompt(null);
        scrollToBottom();
      }
      
      const projectName = projects.find(p => p.id === data.projectId)?.name || 'Gemini Compagnon';
      showNotification(projectName, "La tâche est terminée.");
      await clearProjectNotification(data.projectId);
    });

    socket.on('prompt:required', (data: { projectId: string; text: string }) => {
      if (data.projectId === activeProjectId) {
        setPendingPrompt(data.text);
      }
    });

    socket.on('project:state', (state: ProjectState) => {
      if (state.projectId === activeProjectId) {
        setTerminalOutput(state.terminalLog);
        setIsLoading(state.isRunning);
        setPendingPrompt(state.pendingPrompt);
      }
    });

    return () => {
      socket.off('output:start');
      socket.off('output:chunk');
      socket.off('output:done');
      socket.off('prompt:required');
      socket.off('project:state');
    };
  }, [activeProjectId, projects]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    sendChatMessage(activeProjectId, input);
    
    // Optimistic UI for user message
    const userMsg: Message = { 
      role: 'user', 
      text: input, 
      timestamp: new Date().toISOString() 
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    scrollToBottom();
  };

  const handleProjectSelect = (id: string) => {
    setActiveProjectId(id);
    localStorage.setItem('lastProjectId', id);
    loadProjectData(id);
  };

  const handleAddProject = async (name: string, path: string, icon?: string) => {
    try {
      const newProj = await addProject(name, path, icon);
      const projs = await getProjects();
      setProjects(projs);
      handleProjectSelect(newProj.id);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      const projs = await getProjects();
      setProjects(projs);
      if (activeProjectId === id) {
        if (projs.length > 0) {
          handleProjectSelect(projs[0].id);
        } else {
          setActiveProjectId('');
          localStorage.removeItem('lastProjectId');
          setMessages([]);
        }
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleUpdateProject = async (id: string, updates: Partial<Project>) => {
    try {
      await updateProject(id, updates);
      const projs = await getProjects();
      setProjects(projs);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleReorderProjects = async (ids: string[]) => {
    try {
      const newProjs = await reorderProjects(ids);
      setProjects(newProjs);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handlePromptAction = (action: 'y' | 'n') => {
    sendTerminalInput(activeProjectId, action);
    setPendingPrompt(null);
  };

  const activeProject = projects.find(p => p.id === activeProjectId);
  const ProjectIcon = AVAILABLE_ICONS[activeProject?.icon as keyof typeof AVAILABLE_ICONS] || Bot;

  return (
    <div className="app-container">
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      />
      
      <Sidebar 
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleProjectSelect}
        onAddProject={handleAddProject}
        onDeleteProject={handleDeleteProject}
        onUpdateProject={handleUpdateProject}
        onReorderProjects={handleReorderProjects}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="main-layout">
        <header className="app-header">
          <div className="header-left">
            <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="header-title">
              <ProjectIcon size={24} className="robot-icon" />
              <h1>{activeProject?.name || 'Gemini Compagnon'}</h1>
            </div>
          </div>
          <div className="header-right">
            {activeProjectId && (
              <button className="clear-chat-btn" onClick={handleClear} title="Clear chat (UI only)">
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </header>

        <main className="chat-window">
          <div className="messages-container">
            {displayedMessages.map((msg, idx) => (
              <div key={idx} className={`message-row ${msg.role}`}>
                <div className="bubble">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
              </div>
            ))}

            {streamingMessage !== null && (
              <div className="message-row assistant">
                <div className="bubble">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingMessage}</ReactMarkdown>
                </div>
              </div>
            )}
            
            {isLoading && !pendingPrompt && streamingMessage === null && (
              <div className="message-row assistant">
                <div className="bubble loading">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {pendingPrompt && (
          <div className="validation-overlay">
            <div className="validation-card">
              <h3>Validation requise</h3>
              <p>{pendingPrompt}</p>
              <div className="validation-actions">
                <button className="no-btn" onClick={() => handlePromptAction('n')}>
                  <Close size={18} />
                  <span>Non</span>
                </button>
                <button className="yes-btn" onClick={() => handlePromptAction('y')}>
                  <Check size={18} />
                  <span>Oui</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <Terminal 
          output={terminalOutput}
          isOpen={isTerminalOpen}
          onToggle={() => setIsTerminalOpen(!isTerminalOpen)}
        />

        <footer className="input-area">
          <div className="input-container">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Écris ton message..."
              disabled={isLoading}
              rows={1}
            />
            <button 
              className={`send-button ${input.trim() ? 'active' : ''}`}
              onClick={handleSend} 
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
