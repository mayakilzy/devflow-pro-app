"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Code, Bug, Calendar, Smile, Search, Activity, Book, Settings, Plus, Trash2, Edit, X, Check, AlertCircle, Copy, Filter, Calendar as CalendarIcon, TrendingUp, TrendingDown, BarChart3, Clock, ChevronLeft, ChevronRight, GitCommit, Server, Zap, Folder, FileText, Hash, Tag, ChevronDown, ChevronUp, Star, Bookmark, History, User, Users, Award, LayoutDashboard, Kanban, BookMarked, BookOpen, Sun, Moon, Inbox, CheckCircle, XCircle, AlertTriangle, Info} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { marked } from 'marked';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Types
type Language = 'JavaScript' | 'TypeScript' | 'Python';
type Severity = 'critical' | 'major' | 'minor' | 'cosmetic';
type Status = 'open' | 'in-progress' | 'resolved';
type Category = 'ui' | 'logic' | 'performance' | 'security';

interface Snippet {
  id: string;
  title: string;
  language: Language;
  code: string;
  tags: string[];
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface Bug {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: Status;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  ticketIds: string[];
}

interface KanbanTicket {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high';
  storyPoints: number;
  labels: string[];
  columnId: string;
  createdAt: string;
  updatedAt: string;
}

interface MoodEntry {
  id: string;
  mood: '😊' | '🙃' | '😐' | '😕' | '😢';
  note: string;
  date: string;
}

interface DocumentationResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  lastUpdated: string;
  content: string;
  isBookmarked: boolean;
  category: string;
}

interface CICDProject {
  id: string;
  name: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  lastBuildTime: number;
  commitHash: string;
  commitMessage: string;
  buildNumber: number;
  environment: 'dev' | 'staging' | 'production';
  history: Array<{
    status: 'success' | 'failed' | 'running' | 'pending';
    duration: number;
    timestamp: string;
  }>;
}

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: 'Onboarding' | 'Architecture' | 'Runbooks' | 'FAQs' | 'Best Practices';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  versions: Array<{
    content: string;
    timestamp: string;
  }>;
  linkedProjects: string[];
}

interface ActivityItem {
  id: string;
  type: 'snippet' | 'bug' | 'ticket' | 'mood' | 'doc' | 'cicd' | 'kb';
  action: 'created' | 'updated' | 'deleted';
  title: string;
  timestamp: string;
}

interface Settings {
  theme: 'light' | 'dark';
  notifications: boolean;
  autoSave: boolean;
}

// Utility functions
const playSound = (type: 'success' | 'error' | 'alert') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch (type) {
      case 'success':
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.3;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      case 'error':
        oscillator.frequency.value = 220;
        gainNode.gain.value = 0.3;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      case 'alert':
        oscillator.frequency.value = 660;
        gainNode.gain.value = 0.3;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        setTimeout(() => {
          const oscillator2 = audioContext.createOscillator();
          oscillator2.frequency.value = 660;
          oscillator2.connect(gainNode);
          oscillator2.start();
          oscillator2.stop(audioContext.currentTime + 0.1);
        }, 150);
        break;
    }
  } catch (e) {
    console.log('Audio not supported');
  }
};

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error loading from localStorage:`, e);
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving to localStorage:`, e);
  }
};

const formatDate = (dateString: string): string => {
  return format(new Date(dateString), 'MMM dd, yyyy');
};

const formatDateTime = (dateString: string): string => {
  return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const truncateText = (text: string, maxLength: number): string => {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

const highlightSearchTerm = (text: string, term: string): JSX.Element => {
  if (!term) return <span>{text}</span>;
  
  const regex = new RegExp(`(${term})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span>
      {parts.map((part, index) => 
        regex.test(part) ? <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark> : part
      )}
    </span>
  );
};

const renderMarkdown = (markdown: string): string => {
  return marked(markdown);
};


function SnippetsManager() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState<'all' | 'javascript' | 'typescript' | 'python'>('all');
  const [newSnippet, setNewSnippet] = useState({ title: '', language: 'javascript', code: '', tags: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const filteredSnippets = snippets.filter(snippet => {
    const matchesSearch = snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         snippet.tags.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         snippet.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = languageFilter === 'all' || snippet.language === languageFilter;
    return matchesSearch && matchesLanguage;
  });

  const handleSaveSnippet = () => {
    if (!newSnippet.title.trim() || !newSnippet.code.trim()) return;

    if (editingId) {
      setSnippets(prev => prev.map(s => s.id === editingId ? { ...s, ...newSnippet, updatedAt: new Date().toISOString() } : s));
      showToast('Snippet updated', 'success');
    } else {
      const snippet: Snippet = {
        id: generateId(),
        ...newSnippet,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setSnippets(prev => [...prev, snippet]);
      showToast('Snippet saved', 'success');
    }

    setNewSnippet({ title: '', language: 'javascript', code: '', tags: '', description: '' });
    setEditingId(null);
    setShowPreview(false);
  };

  const handleEditSnippet = (snippet: Snippet) => {
    setNewSnippet({ ...snippet });
    setEditingId(snippet.id);
    setShowPreview(false);
  };

  const handleDeleteSnippet = (id: string) => {
    setSnippets(prev => prev.filter(s => s.id !== id));
    setShowDeleteConfirm(null);
    showToast('Snippet deleted', 'success');
  };

  const handleCopyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast('Code copied to clipboard', 'success');
  };

  const languageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' }
  ];

  const getLanguageColor = (language: string) => {
    switch (language) {
      case 'javascript': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'typescript': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'python': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Code Snippets</h2>
        <button 
          onClick={() => { setNewSnippet({ title: '', language: 'javascript', code: '', tags: '', description: '' }); setEditingId(null); setShowPreview(false); }}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={16} /> New Snippet
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search snippets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <div className="w-48">
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value as any)}
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-violet-500 focus:outline-none"
          >
            <option value="all">All Languages</option>
            {languageOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {editingId && (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">{editingId ? 'Edit Snippet' : 'New Snippet'}</h3>
            <button 
              onClick={() => { setEditingId(null); setNewSnippet({ title: '', language: 'javascript', code: '', tags: '', description: '' }); }}
              className="text-gray-400 hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={newSnippet.title}
                onChange={(e) => setNewSnippet({...newSnippet, title: e.target.value})}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                placeholder="Snippet title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <select
                value={newSnippet.language}
                onChange={(e) => setNewSnippet({...newSnippet, language: e.target.value})}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
              >
                {languageOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={newSnippet.tags}
                onChange={(e) => setNewSnippet({...newSnippet, tags: e.target.value})}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                placeholder="react, hooks, api"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium">Code</label>
                <button 
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-violet-400 hover:text-violet-300"
                >
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
              </div>
              
              {showPreview ? (
                <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
                    <code className={getLanguageColor(newSnippet.language)}>
                      {renderMarkdown(newSnippet.code)}
                    </code>
                  </pre>
                </div>
              ) : (
                <textarea
                  value={newSnippet.code}
                  onChange={(e) => setNewSnippet({...newSnippet, code: e.target.value})}
                  rows={8}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none font-mono text-sm"
                  placeholder="// Your code here..."
                />
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description (Markdown)</label>
              <textarea
                value={newSnippet.description}
                onChange={(e) => setNewSnippet({...newSnippet, description: e.target.value})}
                rows={4}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                placeholder="Describe your snippet..."
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setEditingId(null); setNewSnippet({ title: '', language: 'javascript', code: '', tags: '', description: '' }); }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSnippet}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredSnippets.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-5xl mb-4">💻</div>
          <h3 className="text-xl font-semibold mb-2">No snippets found</h3>
          <p className="text-gray-400 mb-4">
            {snippets.length === 0 
              ? "Save your first snippet to build your library" 
              : "Try adjusting your search or filter"}
          </p>
          {snippets.length === 0 && (
            <button 
              onClick={() => { setNewSnippet({ title: '', language: 'javascript', code: '', tags: '', description: '' }); setEditingId(null); }}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg"
            >
              Create Your First Snippet
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSnippets.map(snippet => (
            <div key={snippet.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{snippet.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getLanguageColor(snippet.language)}`}>
                    {snippet.language}
                  </span>
                </div>
                
                {snippet.tags && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {snippet.tags.split(',').map((tag, index) => (
                      <span key={index} className="text-xs bg-gray-700 px-2 py-1 rounded">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="mb-3">
                  <pre className="bg-gray-900 p-3 rounded overflow-x-auto text-sm">
                    <code className={getLanguageColor(snippet.language)}>
                      {truncateText(snippet.code, 150)}
                    </code>
                  </pre>
                </div>
                
                {snippet.description && (
                  <div className="mb-3 text-sm text-gray-300">
                    {renderMarkdown(truncateText(snippet.description, 100))}
                  </div>
                )}
                
                <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                  <span>Created: {formatDate(snippet.createdAt)}</span>
                  {snippet.updatedAt !== snippet.createdAt && (
                    <span>Updated: {formatDate(snippet.updatedAt)}</span>
                  )}
                </div>
                
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => handleCopyToClipboard(snippet.code)}
                    className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded flex items-center gap-1"
                  >
                    <Copy size={14} /> Copy
                  </button>
                  <button 
                    onClick={() => handleEditSnippet(snippet)}
                    className="text-sm bg-violet-600 hover:bg-violet-700 px-3 py-1 rounded flex items-center gap-1"
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(snippet.id)}
                    className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Delete Snippet</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to delete this snippet? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteSnippet(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BugTracker() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [filters, setFilters] = useState({
    severity: 'all' as 'all' | 'critical' | 'major' | 'minor' | 'cosmetic',
    status: 'all' as 'all' | 'open' | 'in-progress' | 'resolved',
    category: 'all' as 'all' | 'ui' | 'logic' | 'performance' | 'security'
  });
  const [newBug, setNewBug] = useState({ title: '', description: '', severity: 'major' as BugSeverity, status: 'open' as BugStatus, category: 'ui' as BugCategory });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filteredBugs = bugs.filter(bug => {
    return (filters.severity === 'all' || bug.severity === filters.severity) &&
           (filters.status === 'all' || bug.status === filters.status) &&
           (filters.category === 'all' || bug.category === filters.category);
  });

  const handleSaveBug = () => {
    if (!newBug.title.trim()) return;

    if (editingId) {
      setBugs(prev => prev.map(b => b.id === editingId ? { ...b, ...newBug, updatedAt: new Date().toISOString() } : b));
      showToast('Bug updated', 'success');
    } else {
      const bug: Bug = {
        id: generateId(),
        ...newBug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setBugs(prev => [...prev, bug]);
      
      // Play sound for critical bugs
      if (bug.severity === 'critical') {
        playSound('alert');
      }
      
      showToast('Bug reported', 'success');
    }

    setNewBug({ title: '', description: '', severity: 'major', status: 'open', category: 'ui' });
    setEditingId(null);
  };

  const handleEditBug = (bug: Bug) => {
    setNewBug({ ...bug });
    setEditingId(bug.id);
  };

  const handleDeleteBug = (id: string) => {
    setBugs(prev => prev.filter(b => b.id !== id));
    setShowDeleteConfirm(null);
    showToast('Bug deleted', 'success');
  };

  const getSeverityColor = (severity: BugSeverity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'major': return 'bg-orange-500';
      case 'minor': return 'bg-yellow-500';
      case 'cosmetic': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: BugStatus) => {
    switch (status) {
      case 'open': return 'bg-red-500';
      case 'in-progress': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Prepare data for charts
  const severityData = Object.entries(
    bugs.reduce((acc, bug) => {
      acc[bug.severity] = (acc[bug.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Get last 14 days for trend chart
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const trendData = last14Days.map(date => {
    const created = bugs.filter(bug => bug.createdAt.startsWith(date)).length;
    const resolved = bugs.filter(bug => bug.updatedAt.startsWith(date) && bug.status === 'resolved').length;
    return { date, created, resolved };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bug Tracker</h2>
        <button 
          onClick={() => { setNewBug({ title: '', description: '', severity: 'major', status: 'open', category: 'ui' }); setEditingId(null); }}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={16} /> Report Bug
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="w-48">
          <select
            value={filters.severity}
            onChange={(e) => setFilters({...filters, severity: e.target.value as any})}
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-violet-500 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
            <option value="cosmetic">Cosmetic</option>
          </select>
        </div>
        
        <div className="w-48">
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value as any})}
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-violet-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        
        <div className="w-48">
          <select
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value as any})}
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-violet-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="ui">UI</option>
            <option value="logic">Logic</option>
            <option value="performance">Performance</option>
            <option value="security">Security</option>
          </select>
        </div>
      </div>

      {editingId && (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">{editingId ? 'Edit Bug' : 'New Bug'}</h3>
            <button 
              onClick={() => { setEditingId(null); setNewBug({ title: '', description: '', severity: 'major', status: 'open', category: 'ui' }); }}
              className="text-gray-400 hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={newBug.title}
                onChange={(e) => setNewBug({...newBug, title: e.target.value})}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                placeholder="Bug title"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Severity</label>
                <select
                  value={newBug.severity}
                  onChange={(e) => setNewBug({...newBug, severity: e.target.value as BugSeverity})}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                >
                  <option value="critical">Critical</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="cosmetic">Cosmetic</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={newBug.status}
                  onChange={(e) => setNewBug({...newBug, status: e.target.value as BugStatus})}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={newBug.category}
                  onChange={(e) => setNewBug({...newBug, category: e.target.value as BugCategory})}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                >
                  <option value="ui">UI</option>
                  <option value="logic">Logic</option>
                  <option value="performance">Performance</option>
                  <option value="security">Security</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={newBug.description}
                onChange={(e) => setNewBug({...newBug, description: e.target.value})}
                rows={4}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                placeholder="Describe the bug..."
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setEditingId(null); setNewBug({ title: '', description: '', severity: 'major', status: 'open', category: 'ui' }); }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBug}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg"
              >
                {editingId ? 'Update' : 'Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Severity Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={severityData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Bug Trends (14 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="#8884d8" name="Created" />
              <Line type="monotone" dataKey="resolved" stroke="#82ca9d" name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {filteredBugs.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-5xl mb-4">🐞</div>
          <h3 className="text-xl font-semibold mb-2">No bugs tracked</h3>
          <p className="text-gray-400 mb-4">Add one to start tracking issues in your project</p>
          <button 
            onClick={() => { setNewBug({ title: '', description: '', severity: 'major', status: 'open', category: 'ui' }); setEditingId(null); }}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg"
          >
            Report Your First Bug
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBugs.map(bug => (
            <div key={bug.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${getSeverityColor(bug.severity)}`}></span>
                  <h3 className="font-semibold text-lg">{bug.title}</h3>
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(bug.status)} text-white`}>
                    {bug.status}
                  </span>
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                    {bug.category}
                  </span>
                </div>
              </div>
              
              <p className="text-gray-300 mb-3">{bug.description}</p>
              
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Created: {formatDate(bug.createdAt)}</span>
                {bug.updatedAt !== bug.createdAt && (
                  <span>Updated: {formatDate(bug.updatedAt)}</span>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditBug(bug)}
                    className="text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(bug.id)}
                    className="text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Delete Bug</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to delete this bug? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteBug(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SprintBoard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [columns, setColumns] = useState([
    { id: 'backlog', title: 'Backlog' },
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'review', title: 'Review' },
    { id: 'done', title: 'Done' }
  ]);
  const [newTicket, setNewTicket] = useState({ 
    title: '', 
    description: '', 
    assignee: '', 
    priority: 'medium' as TicketPriority, 
    storyPoints: 2 as TicketStoryPoints, 
    labels: '',
    columnId: 'backlog'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Get tickets for each column
  const columnTickets = columns.map(column => ({
    ...column,
    tickets: tickets.filter(ticket => ticket.columnId === column.id)
  }));

  // Calculate sprint velocity (last 6 sprints)
  const sprintData = Array.from({ length: 6 }, (_, i) => {
    const sprintNumber = 6 - i;
    const completedTickets = tickets.filter(t => t.columnId === 'done' && 
      new Date(t.updatedAt).getTime() > new Date().setDate(new Date().getDate() - sprintNumber * 7) &&
      new Date(t.updatedAt).getTime() <= new Date().setDate(new Date().getDate() - (sprintNumber - 1) * 7)
    ).length;
    
    return {
      sprint: `Sprint ${sprintNumber}`,
      points: completedTickets * 3 // Assuming average 3 points per ticket
    };
  }).reverse();

  const handleSaveTicket = () => {
    if (!newTicket.title.trim()) return;

    if (editingId) {
      setTickets(prev => prev.map(t => t.id === editingId ? { ...t, ...newTicket, updatedAt: new Date().toISOString() } : t));
      showToast('Ticket updated', 'success');
    } else {
      const ticket: Ticket = {
        id: generateId(),
        ...newTicket,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setTickets(prev => [...prev, ticket]);
      showToast('Ticket created', 'success');
    }

    setNewTicket({ 
      title: '', 
      description: '', 
      assignee: '', 
      priority: 'medium', 
      storyPoints: 2, 
      labels: '',
      columnId: 'backlog'
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEditTicket = (ticket: Ticket) => {
    setNewTicket({ ...ticket });
    setEditingId(ticket.id);
    setShowForm(true);
  };

  const handleDeleteTicket = (id: string) => {
    setTickets(prev => prev.filter(t => t.id !== id));
    setShowDeleteConfirm(null);
    showToast('Ticket deleted', 'success');
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    setTickets(prev => {
      const newTickets = [...prev];
      const draggedTicket = newTickets.find(t => t.id === draggableId);
      
      if (draggedTicket) {
        draggedTicket.columnId = destination.droppableId;
        draggedTicket.updatedAt = new Date().toISOString();
      }
      
      return newTickets;
    });
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStoryPointsColor = (points: TicketStoryPoints) => {
    switch (points) {
      case 1: return 'bg-blue-500';
      case 2: return 'bg-indigo-500';
      case 3: return 'bg-purple-500';
      case 5: return 'bg-pink-500';
      case 8: return 'bg-red-500';
      case 13: return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sprint Board</h2>
        <button 
          onClick={() => { setNewTicket({ 
            title: '', 
            description: '', 
            assignee: '', 
            priority: 'medium', 
            storyPoints: 2, 
            labels: '',
            columnId: 'backlog'
          }); setEditingId(null); setShowForm(true); }}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">{editingId ? 'Edit Ticket' : 'New Ticket'}</h3>
            <button 
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="text-gray-400 hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={newTicket.title}
                onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                placeholder="Ticket title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                rows={3}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                placeholder="Describe the ticket..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Assignee</label>
                <input
                  type="text"
                  value={newTicket.assignee}
                  onChange={(e) => setNewTicket({...newTicket, assignee: e.target.value})}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                  placeholder="Assignee name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({...newTicket, priority: e.target.value as TicketPriority})}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Story Points</label>
                <select
                  value={newTicket.storyPoints}
                  onChange={(e) => setNewTicket({...newTicket, storyPoints: parseInt(e.target.value) as TicketStoryPoints})}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={13}>13</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Labels (comma separated)</label>
                <input
                  type="text"
                  value={newTicket.labels}
                  onChange={(e) => setNewTicket({...newTicket, labels: e.target.value})}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-violet-500 focus:outline-none"
                  placeholder="bug, feature, ui"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTicket}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Sprint Velocity</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sprintData}>
            <XAxis dataKey="sprint" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="points" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {columnTickets.map(column => (
            <div key={column.id} className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-3 border-b border-gray-700">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{column.title}</h3>
                  <span className="bg-gray-700 text-xs px-2 py-1 rounded-full">
                    {column.tickets.length}
                  </span>
                </div>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="p-3 space-y-3 min-h-[200px]"
                  >
                    {column.tickets.map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-gray-700 rounded-lg p-3 cursor-move hover:bg-gray-600 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm">{ticket.title}</h4>
                              <div className="flex gap-1">
                                <span className={`w-2 h-2 rounded-full ${getPriorityColor(ticket.priority)}`}></span>
                                <span className={`w-2 h-2 rounded-full ${getStoryPointsColor(ticket.storyPoints)}`}></span>
                              </div>
                            </div>
                            
                            {ticket.description && (
                              <p className="text-xs text-gray-300 mb-2 truncate">
                                {ticket.description}
                              </p>
                            )}
                            
                            <div className="flex justify-between items-center text-xs">
                              {ticket.assignee && (
                                <span className="text-gray-400">Assigned to: {ticket.assignee}</span>
                              )}
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => handleEditTicket(ticket)}
                                  className="text-violet-400 hover:text-violet-300"
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  onClick={() => setShowDeleteConfirm(ticket.id)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            
                            {ticket.labels && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {ticket.labels.split(',').map((label, index) => (
                                  <span key={index} className="text-xs bg-gray-800 px-1.5 py-0.5 rounded">
                                    {label.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {tickets.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-xl font-semibold mb-2">No tickets in this sprint</h3>
          <p className="text-gray-400 mb-4">Create your first ticket to start planning</p>
          <button 
            onClick={() => { setNewTicket({ 
              title: '', 
              description: '', 
              assignee: '', 
              priority: 'medium', 
              storyPoints: 2, 
              labels: '',
              columnId: 'backlog'
            }); setEditingId(null); setShowForm(true); }}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg"
          >
            Create Your First Ticket
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Delete Ticket</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to delete this ticket? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteTicket(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  // State management
  const [activeView, setActiveView] = useState<'dashboard' | 'snippets' | 'bugs' | 'sprint' | 'mood' | 'docs' | 'cicd' | 'knowledge' | 'settings'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState<Array<{id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string; timestamp: number}>>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  
  // Command palette state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  
  // Navigation commands
  const navigationCommands = [
    { id: 'dashboard', title: 'Dashboard', keywords: ['home', 'overview', 'stats'] },
    { id: 'snippets', title: 'Snippets', keywords: ['code', 'snippets', 'library'] },
    { id: 'bugs', title: 'Bugs', keywords: ['issues', 'bugs', 'tracker'] },
    { id: 'sprint', title: 'Sprint', keywords: ['kanban', 'board', 'tickets'] },
    { id: 'mood', title: 'Mood', keywords: ['team', 'sentiment', 'check-in'] },
    { id: 'docs', title: 'Documentation', keywords: ['docs', 'search', 'api'] },
    { id: 'cicd', title: 'CI/CD', keywords: ['builds', 'deploy', 'monitor'] },
    { id: 'knowledge', title: 'Knowledge Base', keywords: ['kb', 'articles', 'docs'] },
    { id: 'settings', title: 'Settings', keywords: ['config', 'preferences', 'theme'] },
  ];
  
  const actionCommands = [
    { id: 'new-snippet', title: 'New Snippet', keywords: ['create', 'snippet', 'code'] },
    { id: 'new-bug', title: 'New Bug', keywords: ['report', 'issue', 'bug'] },
    { id: 'new-ticket', title: 'New Ticket', keywords: ['create', 'ticket', 'task'] },
    { id: 'check-mood', title: 'Check Mood', keywords: ['mood', 'check-in', 'sentiment'] },
    { id: 'search-docs', title: 'Search Docs', keywords: ['search', 'documentation', 'api'] },
    { id: 'new-article', title: 'New Article', keywords: ['create', 'article', 'knowledge'] },
    { id: 'toggle-theme', title: 'Toggle Theme', keywords: ['theme', 'dark', 'light'] },
    { id: 'export-data', title: 'Export Data', keywords: ['export', 'backup', 'save'] },
  ];
  
  // Filter commands based on search query
  const filteredCommands = [
    ...navigationCommands,
    ...actionCommands,
  ].filter(cmd => 
    cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Execute command
  const executeCommand = (commandId: string) => {
    // Add to recent commands
    setRecentCommands(prev => [commandId, ...prev.slice(0, 4)]);
    
    // Handle navigation commands
    if (navigationCommands.some(cmd => cmd.id === commandId)) {
      setActiveView(commandId as any);
      setCommandPaletteOpen(false);
      return;
    }
    
    // Handle action commands
    switch (commandId) {
      case 'new-snippet':
        setActiveView('snippets');
        setCommandPaletteOpen(false);
        // Add logic to create new snippet
        break;
      case 'new-bug':
        setActiveView('bugs');
        setCommandPaletteOpen(false);
        // Add logic to create new bug
        break;
      case 'new-ticket':
        setActiveView('sprint');
        setCommandPaletteOpen(false);
        // Add logic to create new ticket
        break;
      case 'check-mood':
        setActiveView('mood');
        setCommandPaletteOpen(false);
        // Add logic to open mood check-in
        break;
      case 'search-docs':
        setActiveView('docs');
        setCommandPaletteOpen(false);
        // Add logic to focus search bar
        break;
      case 'new-article':
        setActiveView('knowledge');
        setCommandPaletteOpen(false);
        // Add logic to create new article
        break;
      case 'toggle-theme':
        setDarkMode(prev => !prev);
        setCommandPaletteOpen(false);
        break;
      case 'export-data':
        // Add logic to export data
        setToasts(prev => [...prev, {
          id: generateId(),
          type: 'success',
          message: 'Data exported successfully',
          timestamp: Date.now()
        }]);
        setCommandPaletteOpen(false);
        break;
    }
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
        setSearchQuery('');
        setSelectedCommandIndex(0);
      }
      
      if (commandPaletteOpen && filteredCommands.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCommandIndex(prev => (prev + 1) % filteredCommands.length);
        }
        
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        }
        
        if (e.key === 'Enter') {
          e.preventDefault();
          executeCommand(filteredCommands[selectedCommandIndex].id);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, filteredCommands, selectedCommandIndex]);
  
  // Toast system
  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, type, message, timestamp: Date.now() }]);
    
    // Play sound for error and success
    if (type === 'error') playSound('error');
    if (type === 'success') playSound('success');
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };
  
  // Render active view
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <p className="text-sm text-gray-500">Snippets</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <p className="text-sm text-gray-500">Open Bugs</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <p className="text-sm text-gray-500">Sprint Tickets</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </div>
        );
      case 'snippets':
        return <SnippetsManager />;
      case 'bugs':
        return <BugTracker />;
      case 'sprint':
        return <SprintBoard />;
      case 'mood':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Team Mood</h1>
            <p className="text-gray-500">Mood tracking coming soon.</p>
          </div>
        );
      case 'docs':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Documentation Finder</h1>
            <p className="text-gray-500">Search documentation coming soon.</p>
          </div>
        );
      case 'cicd':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">CI/CD Monitor</h1>
            <p className="text-gray-500">Build monitoring coming soon.</p>
          </div>
        );
      case 'knowledge':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Knowledge Base</h1>
            <p className="text-gray-500">Knowledge articles coming soon.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Settings</h1>
            <p className="text-gray-500">Settings coming soon.</p>
          </div>
        );
      default:
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
          </div>
        );
    }
  };
  
  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg shadow-lg max-w-md transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-600' :
              toast.type === 'error' ? 'bg-red-600' :
              toast.type === 'warning' ? 'bg-yellow-600' :
              'bg-blue-600'
            }`}
          >
            <div className="flex items-center">
              <span className="mr-2">
                {toast.type === 'success' ? '✓' : 
                 toast.type === 'error' ? '✗' : 
                 toast.type === 'warning' ? '⚠' : 'ℹ'}
              </span>
              <span>{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Command palette */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="p-4 border-b border-gray-700">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedCommandIndex(0);
                }}
                placeholder="Type a command..."
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                autoFocus
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="p-4 text-gray-400">No commands found</div>
              ) : (
                filteredCommands.map((cmd, index) => (
                  <div
                    key={cmd.id}
                    className={`p-4 cursor-pointer hover:bg-gray-700 ${
                      index === selectedCommandIndex ? 'bg-gray-700' : ''
                    }`}
                    onClick={() => executeCommand(cmd.id)}
                  >
                    <div className="font-medium">{cmd.title}</div>
                    <div className="text-sm text-gray-400">
                      {cmd.keywords.join(', ')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gray-800 h-screen transition-all duration-300 flex flex-col`}>
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center">
              <div className="text-xl font-bold text-violet-500">DevFlow Pro</div>
              {sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="ml-auto text-gray-400 hover:text-white"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
            </div>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-4">
            {navigationCommands.map((nav) => (
              <button
                key={nav.id}
                onClick={() => setActiveView(nav.id as any)}
                className={`w-full flex items-center px-4 py-3 text-left ${
                  activeView === nav.id ? 'bg-violet-900 text-violet-300' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="mr-3">
                  {nav.id === 'dashboard' && <LayoutDashboard size={20} />}
                  {nav.id === 'snippets' && <Code size={20} />}
                  {nav.id === 'bugs' && <Bug size={20} />}
                  {nav.id === 'sprint' && <Kanban size={20} />}
                  {nav.id === 'mood' && <Smile size={20} />}
                  {nav.id === 'docs' && <BookOpen size={20} />}
                  {nav.id === 'cicd' && <Activity size={20} />}
                  {nav.id === 'knowledge' && <BookMarked size={20} />}
                  {nav.id === 'settings' && <Settings size={20} />}
                </div>
                {sidebarOpen && <span>{nav.title}</span>}
              </button>
            ))}
          </nav>
          
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white flex items-center"
            >
              {sidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              {sidebarOpen && <span className="ml-2">Collapse</span>}
            </button>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold capitalize">
                {activeView === 'dashboard' ? 'Dashboard' : 
                 activeView === 'snippets' ? 'Code Snippets' : 
                 activeView === 'bugs' ? 'Bug Tracker' : 
                 activeView === 'sprint' ? 'Sprint Board' : 
                 activeView === 'mood' ? 'Team Mood' : 
                 activeView === 'docs' ? 'Documentation Finder' : 
                 activeView === 'cicd' ? 'CI/CD Monitor' : 
                 activeView === 'knowledge' ? 'Knowledge Base' : 
                 'Settings'}
              </h1>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setDarkMode(!darkMode);
                    addToast('info', `Switched to ${!darkMode ? 'dark' : 'light'} mode`);
                  }}
                  className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button
                  onClick={() => setCommandPaletteOpen(true)}
                  className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <Search size={20} />
                  <span className="sr-only">Open command palette (Cmd+K)</span>
                </button>
              </div>
            </div>
            
            {/* Active view content */}
            {renderActiveView()}
          </div>
        </div>
      </div>
    </div>
  );
}
