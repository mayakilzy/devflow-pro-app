"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Home, Code, Bug, Calendar, Smile, Search, Activity, Book, Settings, Plus, Trash2, Edit, X, Check, AlertCircle, Filter, Copy, CalendarDays, BarChart3, LineChart, TrendingUp, Clock, User, Tag, FileText, Bookmark, History, Zap, GitBranch, Server, Database, File, Folder, ChevronDown, ChevronUp, Menu, X as Close, Moon, Sun } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { marked } from 'marked';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Types
type Snippet = {
  id: string;
  title: string;
  language: 'JavaScript' | 'TypeScript' | 'Python';
  code: string;
  tags: string[];
  description: string;
  createdAt: string;
  updatedAt: string;
};

type Bug = {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  status: 'open' | 'in-progress' | 'resolved';
  category: 'ui' | 'logic' | 'performance' | 'security';
  createdAt: string;
  updatedAt: string;
};

type MoodEntry = {
  id: string;
  mood: '😊' | '🙃' | '😐' | '😕' | '😢';
  note?: string;
  timestamp: string;
};

type DocumentationResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  lastUpdated: string;
  category: string;
  isBookmarked: boolean;
  content: string;
};

type KnowledgeArticle = {
  id: string;
  title: string;
  content: string;
  category: 'onboarding' | 'architecture' | 'runbooks' | 'faqs' | 'best-practices';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  versions: { content: string; timestamp: string }[];
  linkedProjects: string[];
};

type CICDProject = {
  id: string;
  name: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  lastBuildTime: number;
  commitHash: string;
  commitMessage: string;
  buildNumber: number;
  environment: 'dev' | 'staging' | 'production';
  history: {
    status: 'success' | 'failed' | 'running' | 'pending';
    duration: number;
    timestamp: string;
  }[];
};

type ActivityItem = {
  id: string;
  type: 'snippet' | 'bug' | 'ticket' | 'mood' | 'doc' | 'cicd' | 'kb';
  action: 'created' | 'updated' | 'deleted' | 'resolved';
  title: string;
  timestamp: string;
};

type Toast = {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
};

type Command = {
  id: string;
  title: string;
  category: 'navigation' | 'actions' | 'recent';
  action: () => void;
};

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
          oscillator.frequency.value = 660;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
        }, 150);
        break;
    }
  } catch (e) {
    console.error('Error playing sound:', e);
  }
};

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error loading from localStorage for key: ${key}`, e);
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving to localStorage for key: ${key}`, e);
  }
};

const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'MMM dd, yyyy');
};

const formatDateTime = (dateString: string) => {
  return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const getSeverityColor = (severity: Bug['severity']) => {
  switch (severity) {
    case 'critical': return 'bg-red-500 text-white';
    case 'major': return 'bg-orange-500 text-white';
    case 'minor': return 'bg-yellow-500 text-white';
    case 'cosmetic': return 'bg-gray-500 text-white';
  }
};

const getStatusColor = (status: Bug['status']) => {
  switch (status) {
    case 'open': return 'bg-red-100 text-red-800';
    case 'in-progress': return 'bg-blue-100 text-blue-800';
    case 'resolved': return 'bg-green-100 text-green-800';
  }
};

const getCategoryColor = (category: Bug['category']) => {
  switch (category) {
    case 'ui': return 'bg-purple-100 text-purple-800';
    case 'logic': return 'bg-indigo-100 text-indigo-800';
    case 'performance': return 'bg-pink-100 text-pink-800';
    case 'security': return 'bg-red-100 text-red-800';
  }
};

const getLanguageColor = (language: Snippet['language']) => {
  switch (language) {
    case 'JavaScript': return 'bg-yellow-100 text-yellow-800';
    case 'TypeScript': return 'bg-blue-100 text-blue-800';
    case 'Python': return 'bg-green-100 text-green-800';
  }
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
    .then(() => {
      showToast('success', 'Copied to clipboard!');
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
      showToast('error', 'Failed to copy to clipboard');
    });
};

const showToast = (type: Toast['type'], message: string) => {
  const id = generateId();
  setToast(prev => [...prev, { id, type, message }]);
  
  setTimeout(() => {
    setToast(prev => prev.filter(toast => toast.id !== id));
  }, 3000);
};

const renderMarkdown = (markdown: string) => {
  return marked(markdown);
};

// Feature 1: Code Snippet Manager
const SnippetManager = () => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState<'all' | Snippet['language']>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [newSnippet, setNewSnippet] = useState({
    title: '',
    language: 'JavaScript' as Snippet['language'],
    code: '',
    tags: '',
    description: ''
  });
  
  const filteredSnippets = useMemo(() => {
    return snippets.filter(snippet => {
      const matchesSearch = searchTerm === '' || 
        snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snippet.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        snippet.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLanguage = languageFilter === 'all' || snippet.language === languageFilter;
      
      return matchesSearch && matchesLanguage;
    });
  }, [snippets, searchTerm, languageFilter]);
  
  const handleAddSnippet = () => {
    if (!newSnippet.title.trim() || !newSnippet.code.trim()) return;
    
    const snippet: Snippet = {
      id: generateId(),
      title: newSnippet.title,
      language: newSnippet.language,
      code: newSnippet.code,
      tags: newSnippet.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      description: newSnippet.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setSnippets(prev => [snippet, ...prev]);
    setNewSnippet({
      title: '',
      language: 'JavaScript',
      code: '',
      tags: '',
      description: ''
    });
    setShowAddForm(false);
    showToast('success', 'Snippet saved!');
    playSound('success');
  };
  
  const handleEditSnippet = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setNewSnippet({
      title: snippet.title,
      language: snippet.language,
      code: snippet.code,
      tags: snippet.tags.join(', '),
      description: snippet.description
    });
    setShowAddForm(true);
  };
  
  const handleUpdateSnippet = () => {
    if (!editingSnippet || !newSnippet.title.trim() || !newSnippet.code.trim()) return;
    
    const updatedSnippet: Snippet = {
      ...editingSnippet,
      title: newSnippet.title,
      language: newSnippet.language,
      code: newSnippet.code,
      tags: newSnippet.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      description: newSnippet.description,
      updatedAt: new Date().toISOString()
    };
    
    setSnippets(prev => prev.map(s => s.id === editingSnippet.id ? updatedSnippet : s));
    setEditingSnippet(null);
    setNewSnippet({
      title: '',
      language: 'JavaScript',
      code: '',
      tags: '',
      description: ''
    });
    setShowAddForm(false);
    showToast('success', 'Snippet updated!');
    playSound('success');
  };
  
  const handleDeleteSnippet = (id: string) => {
    setSnippets(prev => prev.filter(s => s.id !== id));
    setShowDeleteConfirm(null);
    showToast('success', 'Snippet deleted!');
    playSound('alert');
  };
  
  const handleCopyCode = (code: string) => {
    copyToClipboard(code);
  };
  
  const getLanguageClass = (language: Snippet['language']) => {
    switch (language) {
      case 'JavaScript': return 'bg-yellow-100 text-yellow-800';
      case 'TypeScript': return 'bg-blue-100 text-blue-800';
      case 'Python': return 'bg-green-100 text-green-800';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Code Snippets</h2>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
        >
          <Plus size={16} /> New Snippet
        </button>
      </div>
      
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{editingSnippet ? 'Edit Snippet' : 'Add New Snippet'}</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-gray-700">
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
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="Snippet title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <select
                value={newSnippet.language}
                onChange={(e) => setNewSnippet({...newSnippet, language: e.target.value as Snippet['language']})}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="JavaScript">JavaScript</option>
                <option value="TypeScript">TypeScript</option>
                <option value="Python">Python</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <textarea
                value={newSnippet.code}
                onChange={(e) => setNewSnippet({...newSnippet, code: e.target.value})}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-mono"
                rows={6}
                placeholder="Your code here..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={newSnippet.tags}
                onChange={(e) => setNewSnippet({...newSnippet, tags: e.target.value})}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="tag1, tag2, tag3"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description (Markdown supported)</label>
              <textarea
                value={newSnippet.description}
                onChange={(e) => setNewSnippet({...newSnippet, description: e.target.value})}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                rows={3}
                placeholder="Describe your snippet..."
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={editingSnippet ? handleUpdateSnippet : handleAddSnippet}
                className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
              >
                {editingSnippet ? 'Update' : 'Save'} Snippet
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingSnippet(null);
                  setNewSnippet({
                    title: '',
                    language: 'JavaScript',
                    code: '',
                    tags: '',
                    description: ''
                  });
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Search snippets..."
            />
          </div>
        </div>
        
        <div className="w-48">
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value as 'all' | Snippet['language'])}
            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">All Languages</option>
            <option value="JavaScript">JavaScript</option>
            <option value="TypeScript">TypeScript</option>
            <option value="Python">Python</option>
          </select>
        </div>
      </div>
      
      {filteredSnippets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Code size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No snippets found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Save your first snippet to build your library</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
          >
            Add Your First Snippet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSnippets.map(snippet => (
            <div key={snippet.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{snippet.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getLanguageClass(snippet.language)}`}>
                    {snippet.language}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {snippet.tags.map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="mb-3">
                  <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto text-sm">
                    <code>{snippet.code}</code>
                  </pre>
                </div>
                
                {snippet.description && (
                  <div className="mb-3">
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(snippet.description) }}
                    />
                  </div>
                )}
                
                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                  <span>Created: {formatDate(snippet.createdAt)}</span>
                  <span>Updated: {formatDate(snippet.updatedAt)}</span>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 flex justify-end gap-2">
                <button 
                  onClick={() => handleCopyCode(snippet.code)}
                  className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <Copy size={16} /> Copy
                </button>
                <button 
                  onClick={() => handleEditSnippet(snippet)}
                  className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <Edit size={16} /> Edit
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(snippet.id)}
                  className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">Are you sure you want to delete this snippet? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteSnippet(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Feature 2: Bug Tracker
const BugTracker = () => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [filter, setFilter] = useState<{
    severity: 'all' | Bug['severity'];
    status: 'all' | Bug['status'];
    category: 'all' | Bug['category'];
  }>({ severity: 'all', status: 'all', category: 'all' });
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBug, setEditingBug] = useState<Bug | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [newBug, setNewBug] = useState({
    title: '',
    description: '',
    severity: 'major' as Bug['severity'],
    status: 'open' as Bug['status'],
    category: 'ui' as Bug['category']
  });
  
  const filteredBugs = useMemo(() => {
    return bugs.filter(bug => {
      const matchesSeverity = filter.severity === 'all' || bug.severity === filter.severity;
      const matchesStatus = filter.status === 'all' || bug.status === filter.status;
      const matchesCategory = filter.category === 'all' || bug.category === filter.category;
      
      return matchesSeverity && matchesStatus && matchesCategory;
    });
  }, [bugs, filter]);
  
  const bugStats = useMemo(() => {
    const severityCounts = {
      critical: bugs.filter(b => b.severity === 'critical').length,
      major: bugs.filter(b => b.severity === 'major').length,
      minor: bugs.filter(b => b.severity === 'minor').length,
      cosmetic: bugs.filter(b => b.severity === 'cosmetic').length
    };
    
    const statusCounts = {
      open: bugs.filter(b => b.status === 'open').length,
      'in-progress': bugs.filter(b => b.status === 'in-progress').length,
      resolved: bugs.filter(b => b.status === 'resolved').length
    };
    
    return { severityCounts, statusCounts };
  }, [bugs]);
  
  const bugTrendData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      return date.toISOString().split('T')[0];
    });
    
    return last14Days.map(date => {
      const created = bugs.filter(b => b.createdAt.startsWith(date)).length;
      const resolved = bugs.filter(b => b.status === 'resolved' && b.updatedAt.startsWith(date)).length;
      
      return {
        date: format(new Date(date), 'MMM dd'),
        created,
        resolved
      };
    });
  }, [bugs]);
  
  const handleAddBug = () => {
    if (!newBug.title.trim()) return;
    
    const bug: Bug = {
      id: generateId(),
      title: newBug.title,
      description: newBug.description,
      severity: newBug.severity,
      status: newBug.status,
      category: newBug.category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setBugs(prev => [bug, ...prev]);
    setNewBug({
      title: '',
      description: '',
      severity: 'major',
      status: 'open',
      category: 'ui'
    });
    setShowAddForm(false);
    showToast('success', 'Bug reported!');
    playSound('success');
    
    if (newBug.severity === 'critical') {
      playSound('alert');
    }
  };
  
  const handleEditBug = (bug: Bug) => {
    setEditingBug(bug);
    setNewBug({
      title: bug.title,
      description: bug.description,
      severity: bug.severity,
      status: bug.status,
      category: bug.category
    });
    setShowAddForm(true);
  };
  
  const handleUpdateBug = () => {
    if (!editingBug || !newBug.title.trim()) return;
    
    const updatedBug: Bug = {
      ...editingBug,
      title: newBug.title,
      description: newBug.description,
      severity: newBug.severity,
      status: newBug.status,
      category: newBug.category,
      updatedAt: new Date().toISOString()
    };
    
    setBugs(prev => prev.map(b => b.id === editingBug.id ? updatedBug : b));
    setEditingBug(null);
    setNewBug({
      title: '',
      description: '',
      severity: 'major',
      status: 'open',
      category: 'ui'
    });
    setShowAddForm(false);
    showToast('success', 'Bug updated!');
    playSound('success');
  };
  
  const handleDeleteBug = (id: string) => {
    setBugs(prev => prev.filter(b => b.id !== id));
    setShowDeleteConfirm(null);
    showToast('success', 'Bug deleted!');
    playSound('alert');
  };
  
  const handleResolveBug = (id: string) => {
    setBugs(prev => prev.map(b => 
      b.id === id 
        ? { ...b, status: 'resolved', updatedAt: new Date().toISOString() }
        : b
    ));
    showToast('success', 'Bug resolved!');
    playSound('success');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bug Tracker</h2>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
        >
          <Plus size={16} /> Report Bug
        </button>
      </div>
      
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{editingBug ? 'Edit Bug' : 'Report New Bug'}</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-gray-700">
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
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="Bug title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={newBug.description}
                onChange={(e) => setNewBug({...newBug, description: e.target.value})}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                rows={3}
                placeholder="Describe the bug..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Severity</label>
                <select
                  value={newBug.severity}
                  onChange={(e) => setNewBug({...newBug, severity: e.target.value as Bug['severity']})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
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
                  onChange={(e) => setNewBug({...newBug, status: e.target.value as Bug['status']})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
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
                  onChange={(e) => setNewBug({...newBug, category: e.target.value as Bug['category']})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="ui">UI</option>
                  <option value="logic">Logic</option>
                  <option value="performance">Performance</option>
                  <option value="security">Security</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={editingBug ? handleUpdateBug : handleAddBug}
                className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
              >
                {editingBug ? 'Update' : 'Report'} Bug
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingBug(null);
                  setNewBug({
                    title: '',
                    description: '',
                    severity: 'major',
                    status: 'open',
                    category: 'ui'
                  });
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Severity Distribution</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                Critical
              </span>
              <span>{bugStats.severityCounts.critical}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                Major
              </span>
              <span>{bugStats.severityCounts.major}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                Minor
              </span>
              <span>{bugStats.severityCounts.minor}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                Cosmetic
              </span>
              <span>{bugStats.severityCounts.cosmetic}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Status Distribution</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                Open
              </span>
              <span>{bugStats.statusCounts.open}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                In Progress
              </span>
              <span>{bugStats.statusCounts['in-progress']}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Resolved
              </span>
              <span>{bugStats.statusCounts.resolved}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Bug Trend (14 days)</h3>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bugTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="created" stroke="#ef4444" name="Created" />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={filter.severity === 'all' ? '' : filter.severity}
              onChange={(e) => setFilter({...filter, severity: e.target.value as 'all' | Bug['severity']})}
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Filter by severity..."
            />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={filter.status === 'all' ? '' : filter.status}
              onChange={(e) => setFilter({...filter, status: e.target.value as 'all' | Bug['status']})}
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Filter by status..."
            />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={filter.category === 'all' ? '' : filter.category}
              onChange={(e) => setFilter({...filter, category: e.target.value as 'all' | Bug['category']})}
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Filter by category..."
            />
          </div>
        </div>
      </div>
      
      {filteredBugs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Bug size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No bugs tracked</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Add one to start tracking issues</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
          >
            Report Your First Bug
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBugs.map(bug => (
            <div key={bug.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(bug.severity)}`}>
                      {bug.severity}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(bug.status)}`}>
                      {bug.status}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(bug.category)}`}>
                      {bug.category}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateTime(bug.createdAt)}
                  </div>
                </div>
                
                <h3 className="font-semibold text-lg mb-2">{bug.title}</h3>
                
                {bug.description && (
                  <div className="mb-3">
                    <p className="text-gray-700 dark:text-gray-300">{bug.description}</p>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Updated: {formatDateTime(bug.updatedAt)}
                  </div>
                  <div className="flex gap-2">
                    {bug.status !== 'resolved' && (
                      <button 
                        onClick={() => handleResolveBug(bug.id)}
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                      >
                        Resolve
                      </button>
                    )}
                    <button 
                      onClick={() => handleEditBug(bug)}
                      className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(bug.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">Are you sure you want to delete this bug? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteBug(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function DocumentationFinder() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [searchCategory, setSearchCategory] = useState<string>('all');
  const [categories] = useState(['frontend', 'backend', 'devops', 'database']);
  
  // Mock data for search results
  const mockResults = [
    {
      id: '1',
      title: 'React Documentation',
      url: 'https://reactjs.org/docs',
      snippet: 'React is a JavaScript library for building user interfaces. It lets you compose complex UIs from small and isolated pieces of code called "components".',
      lastUpdated: '2023-05-15',
      content: '# React Documentation\n\nReact is a JavaScript library for building user interfaces. It lets you compose complex UIs from small and isolated pieces of code called "components".\n\n## Key Concepts\n\n- **Components**: The building blocks of React applications\n- **JSX**: Syntax extension for JavaScript\n- **Props**: Passing data to components\n- **State**: Managing component data\n- **Hooks**: Using state and other React features without writing a class',
      category: 'frontend',
      tags: ['react', 'javascript', 'ui'],
      sentiment: 'positive'
    },
    {
      id: '2',
      title: 'Node.js API Reference',
      url: 'https://nodejs.org/api',
      snippet: 'Node.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine. The Node.js API reference provides detailed documentation for all built-in modules.',
      lastUpdated: '2023-06-20',
      content: '# Node.js API Reference\n\nNode.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine. The Node.js API reference provides detailed documentation for all built-in modules.\n\n## Core Modules\n\n- **fs**: File system operations\n- **path**: Path utilities\n- **http**: HTTP server and client\n- **events**: Event emitter\n- **stream**: Stream-based interfaces',
      category: 'backend',
      tags: ['nodejs', 'javascript', 'api'],
      sentiment: 'neutral'
    },
    {
      id: '3',
      title: 'Docker Documentation',
      url: 'https://docs.docker.com',
      snippet: 'Docker is a platform for developing, shipping, and running applications in containers. Containers package up code and all its dependencies.',
      lastUpdated: '2023-07-10',
      content: '# Docker Documentation\n\nDocker is a platform for developing, shipping, and running applications in containers. Containers package up code and all its dependencies.\n\n## Getting Started\n\n- **Installation**: Install Docker on your system\n- **Images**: Create and manage container images\n- **Containers**: Run and manage containers\n- **Volumes**: Persist data generated by containers\n- **Networking**: Connect containers to each other',
      category: 'devops',
      tags: ['docker', 'containers', 'devops'],
      sentiment: 'positive'
    }
  ];

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    // Add to recent searches
    const newSearch = {
      query: searchQuery,
      timestamp: new Date().toISOString(),
      results: mockResults.length
    };
    
    setRecentSearches(prev => {
      const updated = [newSearch, ...prev.filter(s => s.query !== searchQuery)].slice(0, 10);
      return updated;
    });
    
    // Simulate search with toolkit tools
    setSearchStatus('🔍 Searching with duckduckgo_search_tool...');
    
    setTimeout(() => {
      setSearchStatus('📄 Scraping with crawl4ai_crawler_tool...');
      
      setTimeout(() => {
        setSearchStatus('🧠 Analyzing with buzz_sentiment_analyzer_tool...');
        
        setTimeout(() => {
          // Filter results based on search query and category
          const filtered = mockResults.filter(result => {
            const matchesQuery = result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                result.snippet.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = searchCategory === 'all' || result.category === searchCategory;
            return matchesQuery && matchesCategory;
          });
          
          setSearchResults(filtered);
          setSearchStatus('');
        }, 800);
      }, 1000);
    }, 800);
  };

  const handleResultClick = (result: any) => {
    setSelectedResult(result);
  };

  const toggleFavorite = (result: any) => {
    if (favorites.some(fav => fav.id === result.id)) {
      setFavorites(favorites.filter(fav => fav.id !== result.id));
    } else {
      setFavorites([...favorites, { ...result, favoritedAt: new Date().toISOString() }]);
    }
  };

  const handleBackToResults = () => {
    setSelectedResult(null);
  };

  // Toolkit Integration: This feature simulates the following AgentCraft-Toolkit tools:
  // - duckduckgo_search_tool: Searches the web for documentation
  // - crawl4ai_crawler_tool: Scrapes and extracts content from documentation pages
  // - buzz_sentiment_analyzer_tool: Analyzes sentiment of community discussions about the library

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Documentation Finder</h1>
      
      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for library or API documentation..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
          >
            Search
          </button>
        </div>
        
        {/* Category Filter */}
        <div className="flex gap-2 mb-4">
          <select
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
            ))}
          </select>
        </div>
        
        {/* Search Status */}
        {searchStatus && (
          <div className="text-blue-600 dark:text-blue-400 mb-4">
            {searchStatus}
          </div>
        )}
      </div>
      
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 font-medium ${activeTab === 'search' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Search Results
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 font-medium ${activeTab === 'favorites' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Favorites ({favorites.length})
          </button>
        </div>
      </div>
      
      {/* Content */}
      {activeTab === 'search' ? (
        selectedResult ? (
          // Selected Result Detail View
          <div>
            <button
              onClick={handleBackToResults}
              className="mb-4 text-violet-600 hover:text-violet-800 flex items-center gap-1"
            >
              <ArrowLeft size={16} /> Back to results
            </button>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedResult.title}</h2>
                  <a 
                    href={selectedResult.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {selectedResult.url}
                  </a>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Last updated: {formatDate(selectedResult.lastUpdated)}
                  </p>
                </div>
                <button
                  onClick={() => toggleFavorite(selectedResult)}
                  className="text-gray-400 hover:text-yellow-500"
                >
                  {favorites.some(fav => fav.id === selectedResult.id) ? (
                    <Star size={20} fill="currentColor" />
                  ) : (
                    <Star size={20} />
                  )}
                </button>
              </div>
              
              <div className="mb-4">
                <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm">
                  {selectedResult.category}
                </span>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedResult.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-1 bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="prose dark:prose-invert max-w-none">
                {renderMarkdown(selectedResult.content)}
              </div>
            </div>
          </div>
        ) : searchResults.length > 0 ? (
          // Search Results
          <div className="space-y-4">
            {searchResults.map(result => (
              <div 
                key={result.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer"
                onClick={() => handleResultClick(result)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{result.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{result.snippet}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{result.url}</span>
                      <span>•</span>
                      <span>Updated {formatDate(result.lastUpdated)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(result);
                    }}
                    className="text-gray-400 hover:text-yellow-500 ml-4"
                  >
                    {favorites.some(fav => fav.id === result.id) ? (
                      <Star size={20} fill="currentColor" />
                    ) : (
                      <Star size={20} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Empty State
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">Search for documentation</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Search for any library or API documentation. We'll help you find the resources you need.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Try searching for: React, Node.js, Docker, etc.</p>
            </div>
          </div>
        )
      ) : (
        // Favorites Tab
        favorites.length > 0 ? (
          <div className="space-y-4">
            {favorites.map(result => (
              <div 
                key={result.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer"
                onClick={() => handleResultClick(result)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{result.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{result.snippet}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{result.url}</span>
                      <span>•</span>
                      <span>Updated {formatDate(result.lastUpdated)}</span>
                      <span>•</span>
                      <span>Favorited {formatDate(result.favoritedAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(result);
                    }}
                    className="text-yellow-500 hover:text-yellow-600 ml-4"
                  >
                    <Star size={20} fill="currentColor" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Empty Favorites State
          <div className="text-center py-12">
            <div className="text-5xl mb-4">⭐</div>
            <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Save documentation you frequently reference by clicking the star icon on search results.
            </p>
          </div>
        )
      )}
      
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Recent Searches</h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchQuery(search.query);
                  handleSearch();
                }}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                {search.query}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function CICDMonitor() {
  const [projects, setProjects] = useState([
    {
      id: '1',
      name: 'Frontend',
      status: 'success' as 'success' | 'failed' | 'running' | 'pending',
      lastBuildTime: 120,
      commitHash: 'a1b2c3d',
      commitMessage: 'feat: add new dashboard component',
      buildNumber: 42,
      environment: 'production' as 'dev' | 'staging' | 'production',
      history: [
        { status: 'success', duration: 120, timestamp: '2023-07-20T10:30:00Z' },
        { status: 'success', duration: 115, timestamp: '2023-07-19T10:30:00Z' },
        { status: 'failed', duration: 180, timestamp: '2023-07-18T10:30:00Z' },
        { status: 'success', duration: 125, timestamp: '2023-07-17T10:30:00Z' },
        { status: 'success', duration: 130, timestamp: '2023-07-16T10:30:00Z' },
      ],
      uptimeData: [
        { date: '2023-07-14', uptime: 99.5 },
        { date: '2023-07-15', uptime: 98.2 },
        { date: '2023-07-16', uptime: 99.8 },
        { date: '2023-07-17', uptime: 97.5 },
        { date: '2023-07-18', uptime: 95.0 },
        { date: '2023-07-19', uptime: 99.2 },
        { date: '2023-07-20', uptime: 99.9 },
      ],
      buildTimeData: [
        { date: '2023-07-07', duration: 140 },
        { date: '2023-07-08', duration: 135 },
        { date: '2023-07-09', duration: 125 },
        { date: '2023-07-10', duration: 130 },
        { date: '2023-07-11', duration: 145 },
        { date: '2023-07-12', duration: 120 },
        { date: '2023-07-13', duration: 135 },
        { date: '2023-07-14', duration: 125 },
        { date: '2023-07-15', duration: 130 },
        { date: '2023-07-16', duration: 140 },
        { date: '2023-07-17', duration: 125 },
        { date: '2023-07-18', duration: 150 },
        { date: '2023-07-19', duration: 115 },
        { date: '2023-07-20', duration: 120 },
      ]
    },
    {
      id: '2',
      name: 'Backend',
      status: 'running' as 'success' | 'failed' | 'running' | 'pending',
      lastBuildTime: 180,
      commitHash: 'e4f5g6h',
      commitMessage: 'fix: resolve authentication issue',
      buildNumber: 38,
      environment: 'staging' as 'dev' | 'staging' | 'production',
      history: [
        { status: 'success', duration: 180, timestamp: '2023-07-19T11:45:00Z' },
        { status: 'success', duration: 175, timestamp: '2023-07-18T11:45:00Z' },
        { status: 'success', duration: 185, timestamp: '2023-07-17T11:45:00Z' },
        { status: 'success', duration: 170, timestamp: '2023-07-16T11:45:00Z' },
        { status: 'success', duration: 190, timestamp: '2023-07-15T11:45:00Z' },
      ],
      uptimeData: [
        { date: '2023-07-14', uptime: 99.8 },
        { date: '2023-07-15', uptime: 99.5 },
        { date: '2023-07-16', uptime: 99.2 },
        { date: '2023-07-17', uptime: 98.7 },
        { date: '2023-07-18', uptime: 99.0 },
        { date: '2023-07-19', uptime: 99.6 },
        { date: '2023-07-20', uptime: 99.3 },
      ],
      buildTimeData: [
        { date: '2023-07-07', duration: 200 },
        { date: '2023-07-08', duration: 190 },
        { date: '2023-07-09', duration: 185 },
        { date: '2023-07-10', duration: 195 },
        { date: '2023-07-11', duration: 180 },
        { date: '2023-07-12', duration: 175 },
        { date: '2023-07-13', duration: 190 },
        { date: '2023-07-14', duration: 185 },
        { date: '2023-07-15', duration: 180 },
        { date: '2023-07-16', duration: 195 },
        { date: '2023-07-17', duration: 185 },
        { date: '2023-07-18', duration: 200 },
        { date: '2023-07-19', duration: 175 },
        { date: '2023-07-20', duration: 180 },
      ]
    },
    {
      id: '3',
      name: 'Mobile',
      status: 'pending' as 'success' | 'failed' | 'running' | 'pending',
      lastBuildTime: 0,
      commitHash: 'i7j8k9l',
      commitMessage: 'feat: implement push notifications',
      buildNumber: 15,
      environment: 'dev' as 'dev' | 'staging' | 'production',
      history: [
        { status: 'success', duration: 300, timestamp: '2023-07-18T14:20:00Z' },
        { status: 'failed', duration: 320, timestamp: '2023-07-17T14:20:00Z' },
        { status: 'success', duration: 290, timestamp: '2023-07-16T14:20:00Z' },
        { status: 'success', duration: 310, timestamp: '2023-07-15T14:20:00Z' },
        { status: 'success', duration: 305, timestamp: '2023-07-14T14:20:00Z' },
      ],
      uptimeData: [
        { date: '2023-07-14', uptime: 97.0 },
        { date: '2023-07-15', uptime: 96.5 },
        { date: '2023-07-16', uptime: 98.2 },
        { date: '2023-07-17', uptime: 95.8 },
        { date: '2023-07-18', uptime: 97.5 },
        { date: '2023-07-19', uptime: 96.8 },
        { date: '2023-07-20', uptime: 98.0 },
      ],
      buildTimeData: [
        { date: '2023-07-07', duration: 320 },
        { date: '2023-07-08', duration: 310 },
        { date: '2023-07-09', duration: 330 },
        { date: '2023-07-10', duration: 300 },
        { date: '2023-07-11', duration: 315 },
        { date: '2023-07-12', duration: 325 },
        { date: '2023-07-13', duration: 310 },
        { date: '2023-07-14', duration: 305 },
        { date: '2023-07-15', duration: 310 },
        { date: '2023-07-16', duration: 290 },
        { date: '2023-07-17', duration: 320 },
        { date: '2023-07-18', duration: 300 },
        { date: '2023-07-19', duration: 315 },
        { date: '2023-07-20', duration: 300 },
      ]
    }
  ]);
  
  const [selectedProject, setSelectedProject] = useState('1');
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);
  const [rollbackProject, setRollbackProject] = useState<string | null>(null);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setProjects(prev => {
        return prev.map(project => {
          // Randomly update one project's status
          if (Math.random() < 0.3) { // 30% chance to update
            const statuses: ('success' | 'failed' | 'running' | 'pending')[] = ['success', 'failed', 'running', 'pending'];
            const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            // If status changes, play sound and show toast
            if (newStatus !== project.status) {
              if (newStatus === 'failed') {
                playSound('error');
                showToast(`${project.name} build failed!`, 'error');
              } else if (newStatus === 'success') {
                showToast(`${project.name} build succeeded!`, 'success');
              }
            }
            
            // Generate new build data
            const newBuildTime = newStatus === 'pending' ? 0 : Math.floor(Math.random() * 200) + 60;
            const newBuildNumber = project.buildNumber + 1;
            const newCommitHash = Math.random().toString(36).substring(2, 8);
            const commitMessages = [
              'feat: add new feature',
              'fix: resolve issue',
              'docs: update documentation',
              'refactor: improve code',
              'test: add tests',
              'chore: update dependencies'
            ];
            const newCommitMessage = commitMessages[Math.floor(Math.random() * commitMessages.length)];
            
            // Add to history
            const newHistory = [
              { status: newStatus, duration: newBuildTime, timestamp: new Date().toISOString() },
              ...project.history.slice(0, 9) // Keep last 9
            ];
            
            return {
              ...project,
              status: newStatus,
              lastBuildTime: newBuildTime,
              buildNumber: newBuildNumber,
              commitHash: newCommitHash,
              commitMessage: newCommitMessage,
              history: newHistory
            };
          }
          return project;
        });
      });
    }, 15000); // Update every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRollback = () => {
    if (rollbackProject) {
      const project = projects.find(p => p.id === rollbackProject);
      if (project) {
        showToast(`Rolling back ${project.name} to previous build...`, 'info');
        // In a real app, this would trigger the actual rollback
        setTimeout(() => {
          showToast(`${project.name} rolled back successfully`, 'success');
        }, 2000);
      }
      setShowRollbackConfirm(false);
      setRollbackProject(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Success';
      case 'failed': return 'Failed';
      case 'running': return 'Running';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'staging': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'dev': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">CI/CD Monitor</h1>
      
      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {projects.map(project => (
          <div 
            key={project.id} 
            className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer transition ${selectedProject === project.id ? 'ring-2 ring-violet-500' : 'hover:shadow-md'}`}
            onClick={() => setSelectedProject(project.id)}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{project.name}</h2>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${getStatusColor(project.status)}`}></span>
                <span className="text-sm font-medium">{getStatusText(project.status)}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Last Build:</span>
                <span className="font-medium">
                  {project.lastBuildTime > 0 ? `${project.lastBuildTime}s` : 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Commit:</span>
                <span className="font-mono text-sm">{project.commitHash}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Message:</span>
                <span className="text-sm truncate max-w-[150px]">{project.commitMessage}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Build:</span>
                <span className="font-medium">#{project.buildNumber}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Environment:</span>
                <span className={`text-xs px-2 py-1 rounded ${getEnvironmentColor(project.environment)}`}>
                  {project.environment}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Project Details */}
      {selectedProjectData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{selectedProjectData.name} - Build History</h2>
            <button 
              onClick={() => {
                setRollbackProject(selectedProjectData.id);
                setShowRollbackConfirm(true);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
            >
              <RotateCcw size={16} /> Rollback
            </button>
          </div>
          
          {/* Build History Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {selectedProjectData.history.map((build, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${getStatusColor(build.status)}`}></span>
                        <span>{getStatusText(build.status)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {build.duration > 0 ? `${build.duration}s` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(build.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Uptime Chart */}
            <div>
              <h3 className="text-lg font-semibold mb-4">7-Day Uptime</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedProjectData.uptimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" domain={[90, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                      labelStyle={{ color: '#F9FAFB' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="uptime" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      dot={{ stroke: '#8B5CF6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Build Time Chart */}
            <div>
              <h3 className="text-lg font-semibold mb-4">14-Day Build Time Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedProjectData.buildTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                      labelStyle={{ color: '#F9FAFB' }}
                    />
                    <Bar dataKey="duration" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Rollback Confirmation */}
      {showRollbackConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Rollback</h3>
            <p className="mb-6">
              Are you sure you want to rollback {rollbackProject ? projects.find(p => p.id === rollbackProject)?.name : ''} to the previous build? 
              This action will redeploy the previous version.
            </p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowRollbackConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleRollback}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Empty State (shown when no builds yet) */}
      {projects.every(p => p.history.length === 0) && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🚀</div>
          <h3 className="text-xl font-semibold mb-2">No builds yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Updates will appear here every 15 seconds as builds complete.
          </p>
        </div>
      )}
    

function DocumentationFinder() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showBookmarkConfirm, setShowBookmarkConfirm] = useState<boolean>(false);
  const [bookmarkResult, setBookmarkResult] = useState<any>(null);

  // Toolkit Integration: This feature simulates the following AgentCraft-Toolkit tools:
  // - duckduckgo_search_tool: Searches the web for documentation
  // - crawl4ai_crawler_tool: Scrapes and extracts content from documentation pages
  // - buzz_sentiment_analyzer_tool: Analyzes sentiment of community discussions about the library

  // Mock data for search results
  const mockResults = [
    {
      id: '1',
      title: 'React Documentation',
      url: 'https://reactjs.org/docs',
      snippet: 'React is a JavaScript library for building user interfaces. It allows developers to create reusable UI components.',
      lastUpdated: '2023-10-15',
      content: '# React Documentation\n\nReact is a JavaScript library for building user interfaces. It allows developers to create reusable UI components.',
      category: 'frontend',
      tags: ['react', 'javascript', 'ui'],
      sentiment: 'positive'
    },
    {
      id: '2',
      title: 'Node.js API Reference',
      url: 'https://nodejs.org/api',
      snippet: 'Node.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine. It allows you to run JavaScript on the server side.',
      lastUpdated: '2023-09-20',
      content: '# Node.js API Reference\n\nNode.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine. It allows you to run JavaScript on the server side.',
      category: 'backend',
      tags: ['nodejs', 'javascript', 'api'],
      sentiment: 'neutral'
    },
    {
      id: '3',
      title: 'Docker Documentation',
      url: 'https://docs.docker.com',
      snippet: 'Docker is a platform for developing, shipping, and running applications in containers. Containers package up code and all its dependencies.',
      lastUpdated: '2023-11-01',
      content: '# Docker Documentation\n\nDocker is a platform for developing, shipping, and running applications in containers. Containers package up code and all its dependencies.',
      category: 'devops',
      tags: ['docker', 'containers', 'devops'],
      sentiment: 'positive'
    },
    {
      id: '4',
      title: 'PostgreSQL Tutorial',
      url: 'https://www.postgresql.org/docs/current/tutorial',
      snippet: 'PostgreSQL is a powerful, open source object-relational database system. It supports a large part of the SQL standard and offers many modern features.',
      lastUpdated: '2023-08-30',
      content: '# PostgreSQL Tutorial\n\nPostgreSQL is a powerful, open source object-relational database system. It supports a large part of the SQL standard and offers many modern features.',
      category: 'database',
      tags: ['postgresql', 'sql', 'database'],
      sentiment: 'neutral'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'frontend', name: 'Frontend' },
    { id: 'backend', name: 'Backend' },
    { id: 'devops', name: 'DevOps' },
    { id: 'database', name: 'Database' }
  ];

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    // Add to recent searches
    const newSearch = {
      query: searchQuery,
      timestamp: new Date().toISOString()
    };
    
    setRecentSearches(prev => {
      const updated = [newSearch, ...prev.filter(s => s.query !== searchQuery)];
      return updated.slice(0, 10); // Keep only last 10 searches
    });
    
    // Simulate search with status updates
    setSearchStatus('🔍 Searching with duckduckgo_search_tool...');
    
    setTimeout(() => {
      setSearchStatus('📄 Scraping with crawl4ai_crawler_tool...');
      
      setTimeout(() => {
        setSearchStatus('🧠 Analyzing with buzz_sentiment_analyzer_tool...');
        
        setTimeout(() => {
          // Filter results based on query and category
          const filtered = mockResults.filter(result => {
            const matchesQuery = 
              result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              result.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
              result.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesCategory = selectedCategory === 'all' || result.category === selectedCategory;
            
            return matchesQuery && matchesCategory;
          });
          
          setSearchResults(filtered);
          setSearchStatus('');
        }, 800);
      }, 1000);
    }, 800);
  };

  const handleBookmark = (result: any) => {
    setBookmarkResult(result);
    setShowBookmarkConfirm(true);
  };

  const confirmBookmark = () => {
    if (bookmarkResult) {
      setFavorites(prev => {
        // Check if already bookmarked
        if (prev.some(fav => fav.id === bookmarkResult.id)) {
          return prev;
        }
        return [...prev, { ...bookmarkResult, bookmarkedAt: new Date().toISOString() }];
      });
      
      setShowBookmarkConfirm(false);
      setBookmarkResult(null);
      showToast('Bookmark added successfully', 'success');
    }
  };

  const handleRemoveBookmark = (id: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== id));
    showToast('Bookmark removed', 'info');
  };

  const handleResultClick = (result: any) => {
    setSelectedResult(result);
  };

  const handleBackToResults = () => {
    setSelectedResult(null);
  };

  const readingTime = (text: string) => {
    const wordsPerMinute = 200;
    const words = text.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  // Filter favorites by category
  const filteredFavorites = selectedCategory === 'all' 
    ? favorites 
    : favorites.filter(fav => fav.category === selectedCategory);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Documentation Finder</h1>
      
      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for library or API documentation..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
          >
            Search
          </button>
        </div>
        
        {/* Category Filter */}
        <div className="mt-2 flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedCategory === category.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Search Status */}
      {searchStatus && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-700 dark:text-blue-300">
          {searchStatus}
        </div>
      )}
      
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-2 px-1 ${
              activeTab === 'search'
                ? 'border-b-2 border-violet-600 text-violet-600'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Search Results
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-2 px-1 ${
              activeTab === 'favorites'
                ? 'border-b-2 border-violet-600 text-violet-600'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Favorites ({favorites.length})
          </button>
        </div>
      </div>
      
      {/* Recent Searches */}
      {recentSearches.length > 0 && activeTab === 'search' && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Recent Searches</h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchQuery(search.query);
                  handleSearch();
                }}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                {search.query}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Search Results */}
      {activeTab === 'search' && !selectedResult && (
        <div>
          {searchResults.length === 0 && !searchStatus ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-lg font-medium mb-2">No documentation found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try searching for a library, framework, or API
              </p>
              <button
                onClick={() => setSearchQuery('React')}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
              >
                Try searching for "React"
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.map(result => (
                <div
                  key={result.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg mb-1">{result.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{result.snippet}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          Updated: {formatDate(result.lastUpdated)}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                          {result.category}
                        </span>
                        <div className="flex gap-1">
                          {result.tags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookmark(result);
                      }}
                      className="ml-4 p-2 text-gray-500 hover:text-violet-600 transition"
                    >
                      <Bookmark size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Selected Result Detail */}
      {selectedResult && (
        <div>
          <div className="mb-4">
            <button
              onClick={handleBackToResults}
              className="flex items-center text-violet-600 hover:text-violet-700 transition"
            >
              <ArrowLeft size={16} className="mr-1" /> Back to results
            </button>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold mb-2">{selectedResult.title}</h2>
                <a
                  href={selectedResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 hover:text-violet-700 transition"
                >
                  {selectedResult.url}
                </a>
              </div>
              <button
                onClick={() => handleBookmark(selectedResult)}
                className="p-2 text-gray-500 hover:text-violet-600 transition"
              >
                <Bookmark size={20} />
              </button>
            </div>
            
            <div className="mb-4 flex items-center gap-3 text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Updated: {formatDate(selectedResult.lastUpdated)}
              </span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                {selectedResult.category}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {readingTime(selectedResult.content)} min read
              </span>
              <div className="flex gap-1">
                {selectedResult.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {renderMarkdown(selectedResult.content)}
            </div>
          </div>
        </div>
      )}
      
      {/* Favorites */}
      {activeTab === 'favorites' && (
        <div>
          {filteredFavorites.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📌</div>
              <h3 className="text-lg font-medium mb-2">No bookmarks yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Bookmark documentation articles to save them for later
              </p>
              <button
                onClick={() => setActiveTab('search')}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
              >
                Search Documentation
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFavorites.map(fav => (
                <div
                  key={fav.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg mb-1">{fav.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{fav.snippet}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          Bookmarked: {formatDate(fav.bookmarkedAt)}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                          {fav.category}
                        </span>
                        <div className="flex gap-1">
                          {fav.tags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResultClick(fav)}
                        className="p-2 text-gray-500 hover:text-violet-600 transition"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleRemoveBookmark(fav.id)}
                        className="p-2 text-gray-500 hover:text-red-600 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Bookmark Confirmation Dialog */}
      {showBookmarkConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Bookmark Documentation</h3>
            <p className="mb-6">Do you want to bookmark "{bookmarkResult?.title}"?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBookmarkConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmBookmark}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
              >
                Bookmark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function CICDMonitor() {
  const [projects, setProjects] = useState([
    {
      id: '1',
      name: 'Frontend',
      status: 'success' as 'success' | 'failed' | 'running' | 'pending',
      lastBuildTime: 120,
      commitHash: 'a1b2c3d',
      commitMessage: 'feat: Add new dashboard component',
      buildNumber: 42,
      environment: 'production' as 'dev' | 'staging' | 'production',
      history: [
        { status: 'success', duration: 115, timestamp: new Date(Date.now() - 86400000).toISOString() },
        { status: 'success', duration: 130, timestamp: new Date(Date.now() - 172800000).toISOString() },
        { status: 'failed', duration: 95, timestamp: new Date(Date.now() - 259200000).toISOString() },
        { status: 'success', duration: 125, timestamp: new Date(Date.now() - 345600000).toISOString() },
        { status: 'running', duration: 0, timestamp: new Date(Date.now() - 432000000).toISOString() },
      ]
    },
    {
      id: '2',
      name: 'Backend',
      status: 'running' as 'success' | 'failed' | 'running' | 'pending',
      lastBuildTime: 180,
      commitHash: 'e4f5g6h',
      commitMessage: 'fix: Resolve API timeout issue',
      buildNumber: 28,
      environment: 'staging' as 'dev' | 'staging' | 'production',
      history: [
        { status: 'success', duration: 175, timestamp: new Date(Date.now() - 86400000).toISOString() },
        { status: 'success', duration: 190, timestamp: new Date(Date.now() - 172800000).toISOString() },
        { status: 'success', duration: 165, timestamp: new Date(Date.now() - 259200000).toISOString() },
        { status: 'success', duration: 180, timestamp: new Date(Date.now() - 345600000).toISOString() },
        { status: 'pending', duration: 0, timestamp: new Date(Date.now() - 432000000).toISOString() },
      ]
    },
    {
      id: '3',
      name: 'Mobile',
      status: 'pending' as 'success' | 'failed' | 'running' | 'pending',
      lastBuildTime: 0,
      commitHash: 'i7j8k9l',
      commitMessage: 'feat: Implement user profile screen',
      buildNumber: 15,
      environment: 'dev' as 'dev' | 'staging' | 'production',
      history: [
        { status: 'failed', duration: 220, timestamp: new Date(Date.now() - 86400000).toISOString() },
        { status: 'success', duration: 200, timestamp: new Date(Date.now() - 172800000).toISOString() },
        { status: 'success', duration: 210, timestamp: new Date(Date.now() - 259200000).toISOString() },
        { status: 'success', duration: 195, timestamp: new Date(Date.now() - 345600000).toISOString() },
        { status: 'success', duration: 205, timestamp: new Date(Date.now() - 432000000).toISOString() },
      ]
    }
  ]);
  
  const [uptimeData, setUptimeData] = useState<any[]>([]);
  const [buildTimeData, setBuildTimeData] = useState<any[]>([]);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Generate uptime data for the last 7 days
  useEffect(() => {
    const generateUptimeData = () => {
      const data = [];
      const now = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Generate random uptime between 95% and 100%
        const uptime = 95 + Math.random() * 5;
        
        data.push({
          date: formatDate(date.toISOString()),
          uptime: parseFloat(uptime.toFixed(2)),
          frontend: parseFloat((uptime + (Math.random() * 2 - 1)).toFixed(2)),
          backend: parseFloat((uptime + (Math.random() * 2 - 1)).toFixed(2)),
          mobile: parseFloat((uptime + (Math.random() * 2 - 1)).toFixed(2))
        });
      }
      
      setUptimeData(data);
    };
    
    generateUptimeData();
  }, []);

  // Generate build time data for the last 14 days
  useEffect(() => {
    const generateBuildTimeData = () => {
      const data = [];
      const now = new Date();
      
      for (let i = 13; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Generate random build time between 60 and 240 seconds
        const frontendTime = 60 + Math.random() * 60;
        const backendTime = 90 + Math.random() * 90;
        const mobileTime = 120 + Math.random() * 120;
        
        data.push({
          date: formatDate(date.toISOString()),
          frontend: parseFloat(frontendTime.toFixed(0)),
          backend: parseFloat(backendTime.toFixed(0)),
          mobile: parseFloat(mobileTime.toFixed(0))
        });
      }
      
      setBuildTimeData(data);
    };
    
    generateBuildTimeData();
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setProjects(prevProjects => {
        return prevProjects.map(project => {
          // Randomly update one project's status
          if (Math.random() > 0.7) {
            const statuses: ('success' | 'failed' | 'running' | 'pending')[] = ['success', 'failed', 'running', 'pending'];
            const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const oldStatus = project.status;
            
            // If status changed, play sound and show toast
            if (oldStatus !== newStatus) {
              if (newStatus === 'failed') {
                playSound('error');
                showToast(`${project.name} build failed!`, 'error');
              } else if (newStatus === 'success') {
                showToast(`${project.name} build succeeded!`, 'success');
              }
            }
            
            // Generate new build data
            const newBuildTime = newStatus === 'success' || newStatus === 'failed' 
              ? Math.floor(60 + Math.random() * 180) 
              : 0;
            
            const newBuildNumber = project.buildNumber + 1;
            const newCommitHash = Math.random().toString(36).substring(2, 8);
            const commitMessages = [
              'feat: Add new feature',
              'fix: Resolve bug',
              'docs: Update documentation',
              'refactor: Improve code',
              'test: Add tests',
              'chore: Update dependencies'
            ];
            const newCommitMessage = commitMessages[Math.floor(Math.random() * commitMessages.length)];
            
            // Add to history
            const newHistory = [
              { status: newStatus, duration: newBuildTime, timestamp: new Date().toISOString() },
              ...project.history.slice(0, 9) // Keep only last 10 builds
            ];
            
            return {
              ...project,
              status: newStatus,
              lastBuildTime: newBuildTime,
              commitHash: newCommitHash,
              commitMessage: newCommitMessage,
              buildNumber: newBuildNumber,
              history: newHistory
            };
          }
          
          return project;
        });
      });
    }, 15000); // Update every 15 seconds
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Success';
      case 'failed': return 'Failed';
      case 'running': return 'Running';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'staging': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'dev': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const handleRollback = (projectId: string) => {
    setShowRollbackConfirm(projectId);
  };

  const confirmRollback = () => {
    if (showRollbackConfirm) {
      const project = projects.find(p => p.id === showRollbackConfirm);
      if (project) {
        showToast(`Rolling back ${project.name} to previous version...`, 'info');
        // In a real app, this would trigger an actual rollback
      }
      setShowRollbackConfirm(null);
    }
  };

  const handleProjectClick = (projectId: string) => {
    setSelectedProject(selectedProject === projectId ? null : projectId);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">CI/CD Monitor</h1>
      
      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {projects.map(project => (
          <div 
            key={project.id} 
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedProject === project.id 
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' 
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
            onClick={() => handleProjectClick(project.id)}
          >
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-lg font-semibold">{project.name}</h2>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(project.status)}`}></div>
                <span className="text-sm font-medium">{getStatusText(project.status)}</span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Build:</span>
                <span>#{project.buildNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                <span>
                  {project.lastBuildTime > 0 
                    ? `${formatDuration(project.lastBuildTime)}` 
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Commit:</span>
                <span className="font-mono text-xs">{project.commitHash}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Message:</span>
                <span className="truncate max-w-[120px]" title={project.commitMessage}>
                  {project.commitMessage}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Environment:</span>
                <span className={`px-2 py-1 rounded text-xs ${getEnvironmentColor(project.environment)}`}>
                  {project.environment}
                </span>
              </div>
            </div>
            
            {selectedProject === project.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-medium mb-2">Recent Builds</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {project.history.map((build, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(build.status)}`}></div>
                        <span>{formatDateTime(build.timestamp)}</span>
                      </div>
                      <span>
                        {build.duration > 0 ? `${formatDuration(build.duration)}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRollback(project.id);
                  }}
                  className="mt-3 w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm"
                >
                  Rollback
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uptime Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="font-medium mb-4">Uptime (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={uptimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" domain={[90, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Area type="monotone" dataKey="frontend" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
              <Area type="monotone" dataKey="backend" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              <Area type="monotone" dataKey="mobile" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Build Time Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="font-medium mb-4">Average Build Time (Last 14 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={buildTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Bar dataKey="frontend" fill="#8b5cf6" name="Frontend" />
              <Bar dataKey="backend" fill="#3b82f6" name="Backend" />
              <Bar dataKey="mobile" fill="#10b981" name="Mobile" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Rollback Confirmation Dialog */}
      {showRollbackConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Rollback</h3>
            <p className="mb-6">
              Are you sure you want to rollback the {projects.find(p => p.id === showRollbackConfirm)?.name} project? 
              This will revert to the previous stable version.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRollbackConfirm(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmRollback}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


function KnowledgeBase() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [newArticle, setNewArticle] = useState<Omit<KnowledgeArticle, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    content: '',
    category: 'Onboarding',
    tags: [],
    linkedProjects: []
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchResults, setSearchResults] = useState<KnowledgeArticle[]>([]);
  const [featuredArticle, setFeaturedArticle] = useState<KnowledgeArticle | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('devflow-pro');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed.knowledgeBase) {
        setArticles(parsed.knowledgeBase);
      }
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedData = localStorage.getItem('devflow-pro');
      const data = savedData ? JSON.parse(savedData) : {};
      localStorage.setItem('devflow-pro', JSON.stringify({
        ...data,
        knowledgeBase: articles
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [articles]);

  // Initialize featured article
  useEffect(() => {
    if (articles.length > 0 && !featuredArticle) {
      // Find the most recently updated article
      const latest = [...articles].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      setFeaturedArticle(latest);
    }
  }, [articles, featuredArticle]);

  // Search articles
  useEffect(() => {
    if (!searchQuery && selectedCategory === 'All') {
      setSearchResults(articles);
      return;
    }

    const filtered = articles.filter(article => {
      const matchesSearch = 
        searchQuery === '' || 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    setSearchResults(filtered);
  }, [searchQuery, selectedCategory, articles]);

  const handleCreateArticle = () => {
    if (!newArticle.title.trim() || !newArticle.content.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }

    const article: KnowledgeArticle = {
      id: generateId(),
      title: newArticle.title,
      content: newArticle.content,
      category: newArticle.category,
      tags: newArticle.tags,
      linkedProjects: newArticle.linkedProjects,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [{
        id: generateId(),
        content: newArticle.content,
        createdAt: new Date().toISOString()
      }]
    };

    setArticles([...articles, article]);
    setNewArticle({
      title: '',
      content: '',
      category: 'Onboarding',
      tags: [],
      linkedProjects: []
    });
    setShowCreateModal(false);
    showToast('Article created successfully', 'success');
    playSound('success');
  };

  const handleUpdateArticle = () => {
    if (!editingArticle || !editingArticle.title.trim() || !editingArticle.content.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }

    const updatedArticles = articles.map(article => {
      if (article.id === editingArticle.id) {
        const updated = {
          ...article,
          title: editingArticle.title,
          content: editingArticle.content,
          category: editingArticle.category,
          tags: editingArticle.tags,
          linkedProjects: editingArticle.linkedProjects,
          updatedAt: new Date().toISOString(),
          versions: [
            ...article.versions,
            {
              id: generateId(),
              content: editingArticle.content,
              createdAt: new Date().toISOString()
            }
          ]
        };
        
        // Update featured article if it's the one being edited
        if (featuredArticle && featuredArticle.id === editingArticle.id) {
          setFeaturedArticle(updated);
        }
        
        return updated;
      }
      return article;
    });

    setArticles(updatedArticles);
    setEditingArticle(null);
    setShowEditModal(false);
    showToast('Article updated successfully', 'success');
    playSound('success');
  };

  const handleDeleteArticle = (id: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      const updatedArticles = articles.filter(article => article.id !== id);
      setArticles(updatedArticles);
      
      // Update featured article if it's the one being deleted
      if (featuredArticle && featuredArticle.id === id) {
        const remaining = updatedArticles.length > 0 
          ? [...updatedArticles].sort((a, b) => 
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )[0]
          : null;
        setFeaturedArticle(remaining);
      }
      
      showToast('Article deleted successfully', 'success');
      playSound('success');
    }
  };

  const handleEditArticle = (article: KnowledgeArticle) => {
    setEditingArticle({ ...article });
    setShowEditModal(true);
  };

  const handleLinkProject = (articleId: string, project: string) => {
    const updatedArticles = articles.map(article => {
      if (article.id === articleId) {
        const linkedProjects = article.linkedProjects.includes(project)
          ? article.linkedProjects.filter(p => p !== project)
          : [...article.linkedProjects, project];
        
        return {
          ...article,
          linkedProjects,
          updatedAt: new Date().toISOString()
        };
      }
      return article;
    });
    
    setArticles(updatedArticles);
    showToast(
      `Project ${article.linkedProjects.includes(project) ? 'unlinked' : 'linked'} successfully`, 
      'success'
    );
  };

  const categories = ['All', 'Onboarding', 'Architecture', 'Runbooks', 'FAQs', 'Best Practices'];
  const projectOptions = ['Frontend', 'Backend', 'Mobile'];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Knowledge Base</h1>
        <p className="text-gray-600 dark:text-gray-300">Create and manage knowledge articles for your team</p>
      </div>

      {/* Featured Article */}
      {featuredArticle && (
        <div className="mb-8 p-6 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-violet-700 dark:text-violet-300">Article of the Week</h2>
            <span className="px-3 py-1 bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 rounded-full text-sm">
              {featuredArticle.category}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{featuredArticle.title}</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {featuredArticle.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {truncateText(featuredArticle.content, 200)}
          </p>
          <button 
            onClick={() => setSelectedArticle(featuredArticle)}
            className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium"
          >
            Read more →
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            New Article
          </button>
        </div>
      </div>

      {/* Results */}
      {searchResults.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">No articles found</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {searchQuery || selectedCategory !== 'All' 
              ? 'Try adjusting your search or filters' 
              : 'Create your first knowledge article to get started'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            Create Article
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map(article => (
            <div key={article.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{article.title}</h3>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                  {article.category}
                </span>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {truncateText(article.content, 150)}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {article.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(article.updatedAt)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedArticle(article)}
                    className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 text-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEditArticle(article)}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteArticle(article.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {/* Project Links */}
              {article.linkedProjects.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Linked Projects:</p>
                  <div className="flex flex-wrap gap-2">
                    {article.linkedProjects.map(project => (
                      <button
                        key={project}
                        onClick={() => handleLinkProject(article.id, project)}
                        className="px-2 py-1 bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 rounded text-xs"
                      >
                        {project}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{selectedArticle.title}</h2>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                      {selectedArticle.category}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Updated {formatDateTime(selectedArticle.updatedAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedArticle.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {renderMarkdown(selectedArticle.content)}
                </div>
              </div>
              
              {/* Project Links */}
              {selectedArticle.linkedProjects.length > 0 && (
                <div className="mb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Linked Projects:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedArticle.linkedProjects.map(project => (
                      <button
                        key={project}
                        onClick={() => handleLinkProject(selectedArticle.id, project)}
                        className="px-3 py-1 bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 rounded text-sm"
                      >
                        {project}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Version History */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Version History</h3>
                <div className="space-y-3">
                  {selectedArticle.versions.map((version, index) => (
                    <div key={version.id} className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Version {index + 1}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDateTime(version.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {truncateText(version.content, 100)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Article Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Create New Article</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newArticle.title}
                    onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Enter article title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newArticle.category}
                    onChange={(e) => setNewArticle({...newArticle, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="Onboarding">Onboarding</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Runbooks">Runbooks</option>
                    <option value="FAQs">FAQs</option>
                    <option value="Best Practices">Best Practices</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={newArticle.tags.join(', ')}
                    onChange={(e) => setNewArticle({...newArticle, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Enter tags separated by commas"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Content (Markdown supported)
                  </label>
                  <textarea
                    value={newArticle.content}
                    onChange={(e) => setNewArticle({...newArticle, content: e.target.value})}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Enter article content in Markdown"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Link to Projects
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {projectOptions.map(project => (
                      <button
                        key={project}
                        onClick={() => {
                          const linkedProjects = newArticle.linkedProjects.includes(project)
                            ? newArticle.linkedProjects.filter(p => p !== project)
                            : [...newArticle.linkedProjects, project];
                          setNewArticle({...newArticle, linkedProjects});
                        }}
                        className={`px-3 py-1 rounded text-sm ${
                          newArticle.linkedProjects.includes(project)
                            ? 'bg-violet-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {project}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateArticle}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Create Article
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Article Modal */}
      {showEditModal && editingArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Edit Article</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingArticle.title}
                    onChange={(e) => setEditingArticle({...editingArticle, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Enter article title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={editingArticle.category}
                    onChange={(e) => setEditingArticle({...editingArticle, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="Onboarding">Onboarding</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Runbooks">Runbooks</option>
                    <option value="FAQs">FAQs</option>
                    <option value="Best Practices">Best Practices</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={editingArticle.tags.join(', ')}
                    onChange={(e) => setEditingArticle({...editingArticle, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Enter tags separated by commas"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Content (Markdown supported)
                  </label>
                  <textarea
                    value={editingArticle.content}
                    onChange={(e) => setEditingArticle({...editingArticle, content: e.target.value})}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Enter article content in Markdown"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Link to Projects
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {projectOptions.map(project => (
                      <button
                        key={project}
                        onClick={() => {
                          const linkedProjects = editingArticle.linkedProjects.includes(project)
                            ? editingArticle.linkedProjects.filter(p => p !== project)
                            : [...editingArticle.linkedProjects, project];
                          setEditingArticle({...editingArticle, linkedProjects});
                        }}
                        className={`px-3 py-1 rounded text-sm ${
                          editingArticle.linkedProjects.includes(project)
                            ? 'bg-violet-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {project}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateArticle}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Update Article
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m`;
  };

  // Truncate text utility
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Generate ID utility
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Get severity color utility
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'major': return 'bg-orange-500';
      case 'minor': return 'bg-yellow-500';
      case 'cosmetic': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status color utility
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-500';
      case 'in-progress': return 'bg-blue-500';
      case 'resolved': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Get category color utility
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ui': return 'bg-purple-500';
      case 'logic': return 'bg-blue-500';
      case 'performance': return 'bg-orange-500';
      case 'security': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Get language color utility
  const getLanguageColor = (language: string) => {
    switch (language) {
      case 'JavaScript': return 'bg-yellow-400';
      case 'TypeScript': return 'bg-blue-500';
      case 'Python': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Copy to clipboard utility
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard', 'success');
    } catch (err) {
      showToast('Failed to copy', 'error');
    }
  };

  // Show toast utility
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  // Render markdown utility
  const renderMarkdown = (markdown: string) => {
    const html = marked.parse(markdown);
    // Basic sanitization - remove script tags
    const sanitizedHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return { __html: sanitizedHtml };
  };

  // Snippet Manager component
  function SnippetManager() {
    const [snippets, setSnippets] = useState<Snippet[]>([]);
    const [title, setTitle] = useState('');
    const [language, setLanguage] = useState('JavaScript');
    const [code, setCode] = useState('');
    const [tags, setTags] = useState('');
    const [description, setDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [languageFilter, setLanguageFilter] = useState('All');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
      const savedSnippets = localStorage.getItem('devflow-pro-snippets');
      if (savedSnippets) {
        setSnippets(JSON.parse(savedSnippets));
      }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('devflow-pro-snippets', JSON.stringify(snippets));
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }, [snippets]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!title.trim() || !code.trim()) {
        showToast('Title and code are required', 'error');
        return;
      }

      const newSnippet: Snippet = {
        id: editingId || generateId(),
        title,
        language,
        code,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        description,
        createdAt: editingId ? snippets.find(s => s.id === editingId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        setSnippets(prev => prev.map(s => s.id === editingId ? newSnippet : s));
        showToast('Snippet updated', 'success');
      } else {
        setSnippets(prev => [...prev, newSnippet]);
        showToast('Snippet saved', 'success');
      }

      // Reset form
      setTitle('');
      setLanguage('JavaScript');
      setCode('');
      setTags('');
      setDescription('');
      setEditingId(null);
      setShowForm(false);
    };

    const handleEdit = (snippet: Snippet) => {
      setTitle(snippet.title);
      setLanguage(snippet.language);
      setCode(snippet.code);
      setTags(snippet.tags.join(', '));
      setDescription(snippet.description);
      setEditingId(snippet.id);
      setShowForm(true);
    };

    const handleDelete = (id: string) => {
      if (confirm('Are you sure you want to delete this snippet?')) {
        setSnippets(prev => prev.filter(s => s.id !== id));
        showToast('Snippet deleted', 'success');
      }
    };

    const filteredSnippets = snippets.filter(snippet => {
      const matchesSearch = searchTerm === '' || 
        snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snippet.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        snippet.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLanguage = languageFilter === 'All' || snippet.language === languageFilter;
      
      return matchesSearch && matchesLanguage;
    });

    const languageOptions = ['All', 'JavaScript', 'TypeScript', 'Python'];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Code Snippets</h2>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Plus size={16} />
            New Snippet
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search snippets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
            >
              {languageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Snippet Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{editingId ? 'Edit Snippet' : 'New Snippet'}</h3>
                <button 
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
                  >
                    <option value="JavaScript">JavaScript</option>
                    <option value="TypeScript">TypeScript</option>
                    <option value="Python">Python</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Code</label>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none font-mono"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description (Markdown supported)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-md"
                  >
                    {editingId ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Snippets List */}
        {filteredSnippets.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <div className="text-5xl mb-4">💻</div>
            <h3 className="text-xl font-medium mb-2">No snippets found</h3>
            <p className="text-gray-400 mb-4">
              {snippets.length === 0 
                ? "Save your first snippet to build your library" 
                : "Try adjusting your search or filter"}
            </p>
            {snippets.length === 0 && (
              <button 
                onClick={() => setShowForm(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-md"
              >
                Create Your First Snippet
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSnippets.map(snippet => (
              <div key={snippet.id} className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg">{snippet.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${getLanguageColor(snippet.language)} text-white`}>
                      {snippet.language}
                    </span>
                  </div>
                  
                  {snippet.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {snippet.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-700 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <pre className="bg-gray-900 p-3 rounded-md overflow-x-auto text-sm">
                      <code>{truncateText(snippet.code, 200)}</code>
                    </pre>
                  </div>
                  
                  {snippet.description && (
                    <div className="mb-3">
                      <div 
                        className="text-sm text-gray-300"
                        dangerouslySetInnerHTML={renderMarkdown(snippet.description)}
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>Updated {formatDate(snippet.updatedAt)}</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => copyToClipboard(snippet.code)}
                        className="text-violet-400 hover:text-violet-300"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(snippet)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(snippet.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Bug Tracker component
  function BugTracker() {
    const [bugs, setBugs] = useState<Bug[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState<Severity>('major');
    const [status, setStatus] = useState<Status>('open');
    const [category, setCategory] = useState<Category>('ui');
    const [filterSeverity, setFilterSeverity] = useState<Severity | 'All'>('All');
    const [filterStatus, setFilterStatus] = useState<Status | 'All'>('All');
    const [filterCategory, setFilterCategory] = useState<Category | 'All'>('All');
    const [showForm, setShowForm] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
      const savedBugs = localStorage.getItem('devflow-pro-bugs');
      if (savedBugs) {
        setBugs(JSON.parse(savedBugs));
      }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('devflow-pro-bugs', JSON.stringify(bugs));
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }, [bugs]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!title.trim()) {
        showToast('Title is required', 'error');
        return;
      }

      const newBug: Bug = {
        id: generateId(),
        title,
        description,
        severity,
        status,
        category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setBugs(prev => [...prev, newBug]);
      
      // Play sound for critical bugs
      if (severity === 'critical') {
        playSound('alert');
      }
      
      // Reset form
      setTitle('');
      setDescription('');
      setSeverity('major');
      setStatus('open');
      setCategory('ui');
      setShowForm(false);
      showToast('Bug reported', 'success');
    };

    const handleDelete = (id: string) => {
      if (confirm('Are you sure you want to delete this bug?')) {
        setBugs(prev => prev.filter(b => b.id !== id));
        showToast('Bug deleted', 'success');
      }
    };

    const filteredBugs = bugs.filter(bug => {
      const matchesSeverity = filterSeverity === 'All' || bug.severity === filterSeverity;
      const matchesStatus = filterStatus === 'All' || bug.status === filterStatus;
      const matchesCategory = filterCategory === 'All' || bug.category === filterCategory;
      
      return matchesSeverity && matchesStatus && matchesCategory;
    });

    // Prepare data for charts
    const severityData = [
      { name: 'Critical', value: bugs.filter(b => b.severity === 'critical').length },
      { name: 'Major', value: bugs.filter(b => b.severity === 'major').length },
      { name: 'Minor', value: bugs.filter(b => b.severity === 'minor').length },
      { name: 'Cosmetic', value: bugs.filter(b => b.severity === 'cosmetic').length }
    ];

    // Create trend data for the last 14 days
    const today = new Date();
    const trendData = Array.from({ length: 14 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dateStr = date.toISOString().split('T')[0];
      
      return {
        date: formatDate(date.toISOString()),
        created: bugs.filter(b => b.createdAt.startsWith(dateStr)).length,
        resolved: bugs.filter(b => b.status === 'resolved' && b.updatedAt.startsWith(dateStr)).length
      };
    }).reverse();

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Bug Tracker</h2>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Plus size={16} />
            Report Bug
          </button>
        </div>

        {/* Bug Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">New Bug</h3>
                <button 
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as Severity)}
                      className="w-full px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
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
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Status)}
                      className="w-full px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      className="w-full px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
                    >
                      <option value="ui">UI</option>
                      <option value="logic">Logic</option>
                      <option value="performance">Performance</option>
                      <option value="security">Security</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-md"
                  >
                    Report Bug
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Severity</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as Severity | 'All')}
              className="px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
            >
              <option value="All">All</option>
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="cosmetic">Cosmetic</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as Status | 'All')}
              className="px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
            >
              <option value="All">All</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as Category | 'All')}
              className="px-4 py-2 bg-gray-800 rounded-md border border-gray-700 focus:border-violet-500 focus:outline-none"
            >
              <option value="All">All</option>
              <option value="ui">UI</option>
              <option value="logic">Logic</option>
              <option value="performance">Performance</option>
              <option value="security">Security</option>
            </select>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Severity Breakdown</h3>
            <BarChart width={500} height={300} data={severityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#ddd" />
              <YAxis stroke="#ddd" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Bug Trend (Last 14 Days)</h3>
            <LineChart width={500} height={300} data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="date" stroke="#ddd" />
              <YAxis stroke="#ddd" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="#ef4444" name="Created" />
              <Line type="monotone" dataKey="resolved" stroke="#10b981" name="Resolved" />
            </LineChart>
          </div>
        </div>

        {/* Bugs List */}
        {filteredBugs.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <div className="text-5xl mb-4">🐞</div>
            <h3 className="text-xl font-medium mb-2">No bugs tracked</h3>
            <p className="text-gray-400 mb-4">Add one to start tracking</p>
            <button 
              onClick={() => setShowForm(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-md"
            >
              Report Your First Bug
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBugs.map(bug => (
              <div key={bug.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-lg">{bug.title}</h3>
                    <p className="text-gray-400 text-sm mt-1">{formatDateTime(bug.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(bug.severity)} text-white`}>
                      {bug.severity}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(bug.status)} text-white`}>
                      {bug.status}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(bug.category)} text-white`}>
                      {bug.category}
                    </span>
                  </div>
                </div>
                
                {bug.description && (
                  <p className="text-gray-300 mb-3">{bug.description}</p>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Updated {formatDate(bug.updatedAt)}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleDelete(bug.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Sprint Kanban Board component
  function SprintKanban() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignee, setAssignee] = useState('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [storyPoints, setStoryPoints] = useState<StoryPoint>(1);
    const [labels, setLabels] = useState('');

    // Load from localStorage on mount
    useEffect(() => {
      const savedTickets = localStorage.getItem('devflow-pro-tickets');
      if (savedTickets) {
        setTickets(JSON.parse(savedTickets));
      }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('devflow-pro-tickets', JSON.stringify(tickets));
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }, [tickets]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!title.trim()) {
        showToast('Title is required', 'error');
        return;
      }

      const newTicket: Ticket = {
        id: editingTicket?.id || generateId(),
        title,
        description,
        assignee,
        priority,
        storyPoints,
        labels: labels.split(',').map(label => label.trim()).filter(Boolean),
        status: editingTicket?.status || 'backlog',
        createdAt: editingTicket?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingTicket) {
        setTickets(prev => prev.map(t => t.id === editingTicket.id ? newTicket : t));
        showToast('Ticket updated', 'success');
      } else {
        setTickets(prev => [...prev, newTicket]);
        showToast('Ticket created', 'success');
      }

      // Reset form
      setTitle('');
      setDescription('');
      setAssignee('');
      setPriority('medium');
      setStoryPoints(1);
      setLabels('');
      setEditingTicket(null);
      setShowForm(false);
    };

    const handleDelete = (id: string) => {
      if (confirm('Are you sure you want to delete this ticket?')) {
        setTickets(prev => prev.filter(t => t.id !== id));
        showToast('Ticket deleted', 'success');
      }
    };

    const handleDragEnd = (result: DropResult) => {
      if (!result.destination) return;

      const items = Array.from(tickets);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      // Update status based on destination column
      const newStatus = result.destination.droppableId as TicketStatus;
      if (reorderedItem.status !== newStatus) {
        reorderedItem.status = newStatus;
        reorderedItem.updatedAt = new Date().toISOString();
      }

      setTickets(items);
    };

    // Group tickets by status
    const backlogTickets = tickets.filter(t => t.status === 'backlog');
    const todoTickets = tickets.filter(t => t.status === 'todo');
    const inProgressTickets = tickets.filter(t => t.status === 'in-progress');
    const reviewTickets = tickets.filter(t => t.status === 'review');
    const doneTickets = tickets.filter(t => t.status === 'done');

    // Prepare data for velocity chart
    const velocityData = [
      { sprint: 'Sprint 1', points: 12 },
      { sprint: 'Sprint 2', points: 18 },
      { sprint: 'Sprint 3', points: 15 },
      { sprint: 'Sprint 4', points: 22 },
      { sprint: 'Sprint 5', points: 20 },
      { sprint: 'Sprint 6', points: 25 }
    ];

    
function KnowledgeBase() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([
    {
      id: '1',
      title: 'Getting Started with DevFlow Pro',
      content: `# Getting Started with DevFlow Pro

Welcome to DevFlow Pro, the ultimate developer productivity platform!

## Key Features

- **Code Snippet Manager**: Save and organize your code snippets
- **Bug Tracker**: Track and manage bugs with severity levels
- **Sprint Kanban**: Plan and track your sprint tickets
- **Team Mood Tracker**: Monitor team morale and well-being
- **Documentation Finder**: Search and bookmark documentation
- **CI/CD Monitor**: Track build statuses and deployments
- **Knowledge Base**: Create and share knowledge articles

## Getting Started

1. Create your first code snippet
2. Set up your first bug report
3. Create a sprint ticket
4. Check in your mood for the day

Happy coding!`,
      category: 'Onboarding',
      tags: ['getting-started', 'tutorial', 'basics'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [],
      linkedProjects: [],
    },
    {
      id: '2',
      title: 'Architecture Overview',
      content: `# DevFlow Pro Architecture

## System Architecture

DevFlow Pro is built with modern web technologies:

- **Frontend**: Next.js 16 with React 19
- **Styling**: Tailwind CSS 3 with dark mode support
- **Charts**: Recharts for data visualization
- **Markdown**: Marked.js for rendering markdown content
- **Drag & Drop**: @hello-pangea/dnd for Kanban board functionality
- **State Management**: React useState with localStorage persistence
- **Audio**: Web Audio API for notifications

## Data Flow

1. User interactions update state via React useState
2. State changes are debounced and saved to localStorage
3. Components re-render based on state updates
4. Charts visualize data from state using Recharts
5. Notifications use Web Audio API for sound alerts

## Performance Considerations

- Drag and drop optimized for 60fps
- Charts render in <500ms
- Search results in <100ms
- CI/CD polling every 15 seconds with proper cleanup`,
      category: 'Architecture',
      tags: ['architecture', 'technical', 'overview'],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      versions: [],
      linkedProjects: ['Frontend', 'Backend'],
    },
    {
      id: '3',
      title: 'Runbook: Common Issues',
      content: `# Runbook: Common Issues

## Authentication Problems

If you're experiencing authentication issues:

1. Clear your browser cache
2. Check if cookies are enabled
3. Try incognito mode
4. Verify your session hasn't expired

## Build Failures

When builds fail:

1. Check the CI/CD Monitor for details
2. Look at recent commits that might have caused the issue
3. Review the build logs in your CI/CD system
4. Rollback to the previous working version if needed

## Data Loss

If you encounter data loss:

1. Check localStorage in your browser developer tools
2. Look for the "devflow-pro" key
3. Try importing a previously exported backup
4. Contact support if the issue persists

## Performance Issues

For slow performance:

1. Disable browser extensions temporarily
2. Check your internet connection
3. Try a different browser
4. Clear your browser cache and cookies`,
      category: 'Runbooks',
      tags: ['troubleshooting', 'issues', 'solutions'],
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      versions: [],
      linkedProjects: ['Backend', 'Mobile'],
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [newArticle, setNewArticle] = useState<Partial<KnowledgeArticle>>({
    title: '',
    content: '',
    category: 'Onboarding',
    tags: [],
  });

  const categories = ['All', 'Onboarding', 'Architecture', 'Runbooks', 'FAQs', 'Best Practices'];

  // Filter articles based on search and category
  const filteredArticles = articles.filter(article => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get article of the week (most recently updated)
  const articleOfWeek = articles.reduce((latest, article) => 
    new Date(article.updatedAt) > new Date(latest.updatedAt) ? article : latest, 
    articles[0]
  );

  const handleCreateArticle = () => {
    if (!newArticle.title || !newArticle.content) return;
    
    const article: KnowledgeArticle = {
      id: generateId(),
      title: newArticle.title,
      content: newArticle.content || '',
      category: newArticle.category || 'Onboarding',
      tags: newArticle.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [],
      linkedProjects: [],
    };
    
    setArticles([article, ...articles]);
    setNewArticle({
      title: '',
      content: '',
      category: 'Onboarding',
      tags: [],
    });
    showToast('Article created successfully', 'success');
  };

  const handleUpdateArticle = () => {
    if (!editingArticle || !editingArticle.title || !editingArticle.content) return;
    
    // Create a new version
    const newVersion = {
      id: generateId(),
      content: editingArticle.content,
      timestamp: new Date().toISOString(),
    };
    
    const updatedArticles = articles.map(article => {
      if (article.id === editingArticle.id) {
        return {
          ...article,
          content: editingArticle.content,
          category: editingArticle.category,
          tags: editingArticle.tags,
          updatedAt: new Date().toISOString(),
          versions: [...article.versions, newVersion],
        };
      }
      return article;
    });
    
    setArticles(updatedArticles);
    setEditingArticle(null);
    showToast('Article updated successfully', 'success');
  };

  const handleDeleteArticle = (id: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      setArticles(articles.filter(article => article.id !== id));
      showToast('Article deleted successfully', 'success');
    }
  };

  const handleLinkProject = (articleId: string, project: string) => {
    const updatedArticles = articles.map(article => {
      if (article.id === articleId) {
        const linkedProjects = article.linkedProjects.includes(project)
          ? article.linkedProjects.filter(p => p !== project)
          : [...article.linkedProjects, project];
        
        return {
          ...article,
          linkedProjects,
        };
      }
      return article;
    });
    
    setArticles(updatedArticles);
    showToast(`Project ${project} ${updatedArticles.find(a => a.id === articleId)?.linkedProjects.includes(project) ? 'linked' : 'unlinked'}`, 'success');
  };

  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  return (
    <div className="space-y-6">
      {/* Article of the Week */}
      {articleOfWeek && (
        <div className="bg-gradient-to-r from-violet-900 to-purple-900 rounded-lg p-4">
          <h3 className="font-medium text-lg mb-2">Article of the Week</h3>
          <h4 className="font-medium text-xl mb-2">{articleOfWeek.title}</h4>
          <p className="text-gray-300 mb-3">{truncateText(articleOfWeek.content, 150)}</p>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <span className="bg-gray-700 px-2 py-1 rounded text-sm">{articleOfWeek.category}</span>
              {articleOfWeek.tags.map(tag => (
                <span key={tag} className="bg-gray-700 px-2 py-1 rounded text-sm">{tag}</span>
              ))}
            </div>
            <button 
              onClick={() => setSelectedArticle(articleOfWeek)}
              className="bg-white text-violet-900 hover:bg-gray-200 px-3 py-1 rounded-md text-sm font-medium"
            >
              Read More
            </button>
          </div>
        </div>
      )}

      {/* Create New Article */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-medium text-lg mb-4">Create New Article</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={newArticle.title}
              onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Enter article title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content (Markdown)</label>
            <textarea
              value={newArticle.content}
              onChange={(e) => setNewArticle({...newArticle, content: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 h-32"
              placeholder="Enter article content in markdown"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={newArticle.category}
                onChange={(e) => setNewArticle({...newArticle, category: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {categories.filter(c => c !== 'All').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={newArticle.tags?.join(', ')}
                onChange={(e) => setNewArticle({...newArticle, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)})}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>
          <button
            onClick={handleCreateArticle}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-md"
          >
            Create Article
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Search articles..."
            />
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Articles List */}
      <div className="space-y-4">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-8 bg-gray-800 rounded-lg">
            <p className="text-gray-400">No articles found. Create your first article to get started!</p>
          </div>
        ) : (
          filteredArticles.map(article => (
            <div key={article.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-lg mb-1">{article.title}</h3>
                  <p className="text-gray-400 text-sm mb-2">{truncateText(article.content, 150)}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-gray-700 px-2 py-1 rounded text-sm">{article.category}</span>
                    {article.tags.map(tag => (
                      <span key={tag} className="bg-gray-700 px-2 py-1 rounded text-sm">{tag}</span>
                    ))}
                    <span className="text-gray-500 text-xs">~{getReadingTime(article.content)} min read</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Updated: {formatDate(article.updatedAt)}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button 
                    onClick={() => setSelectedArticle(article)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-md text-sm"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => setEditingArticle(article)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-md text-sm"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteArticle(article.id)}
                    className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {/* Project Links */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Linked Projects:</div>
                <div className="flex gap-2">
                  {['Frontend', 'Backend', 'Mobile'].map(project => (
                    <button
                      key={project}
                      onClick={() => handleLinkProject(article.id, project)}
                      className={`px-2 py-1 rounded text-xs ${
                        article.linkedProjects.includes(project)
                          ? 'bg-violet-700 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {project}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Article View */}
      {selectedArticle && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-medium text-xl mb-1">{selectedArticle.title}</h3>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-gray-700 px-2 py-1 rounded text-sm">{selectedArticle.category}</span>
                {selectedArticle.tags.map(tag => (
                  <span key={tag} className="bg-gray-700 px-2 py-1 rounded text-sm">{tag}</span>
                ))}
                <span className="text-gray-500 text-xs">~{getReadingTime(selectedArticle.content)} min read</span>
              </div>
              <div className="text-xs text-gray-500">
                Created: {formatDate(selectedArticle.createdAt)} | Updated: {formatDate(selectedArticle.updatedAt)}
              </div>
            </div>
            <button 
              onClick={() => setSelectedArticle(null)}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
          <div className="prose prose-invert max-w-none">
            {renderMarkdown(selectedArticle.content)}
          </div>
          
          {/* Project Links */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400 mb-2">Linked Projects:</div>
            <div className="flex gap-2">
              {['Frontend', 'Backend', 'Mobile'].map(project => (
                <button
                  key={project}
                  onClick={() => handleLinkProject(selectedArticle.id, project)}
                  className={`px-2 py-1 rounded text-xs ${
                    selectedArticle.linkedProjects.includes(project)
                      ? 'bg-violet-700 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {project}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Article Modal */}
      {editingArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg">Edit Article</h3>
              <button 
                onClick={() => setEditingArticle(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={editingArticle.title}
                  onChange={(e) => setEditingArticle({...editingArticle, title: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Content (Markdown)</label>
                <textarea
                  value={editingArticle.content}
                  onChange={(e) => setEditingArticle({...editingArticle, content: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 h-48"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={editingArticle.category}
                    onChange={(e) => setEditingArticle({...editingArticle, category: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {categories.filter(c => c !== 'All').map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={editingArticle.tags?.join(', ')}
                    onChange={(e) => setEditingArticle({...editingArticle, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingArticle(null)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateArticle}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-md"
                >
                  Update Article
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('devflow-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
    localStorage.setItem('devflow-theme', newTheme);
    showToast(`Theme changed to ${newTheme}`, 'success');
  };

  const handleExportData = () => {
    const data = {
      snippets: snippets,
      bugs: bugs,
      tickets: tickets,
      moodEntries: moodEntries,
      docSearches: docSearches,
      ciProjects: ciProjects,
      knowledgeArticles: articles,
      settings: { theme },
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    setExportData(jsonString);
    copyToClipboard(jsonString);
    showToast('Data exported to clipboard', 'success');
  };

  const handleImportData = () => {
    if (!importData) return;
    
    try {
      const data = JSON.parse(importData);
      
      // Validate data structure
      if (!data.snippets || !data.bugs || !data.tickets || !data.moodEntries || 
          !data.docSearches || !data.ciProjects || !data.knowledgeArticles) {
        throw new Error('Invalid data format');
      }
      
      // Import data
      setSnippets(data.snippets);
      setBugs(data.bugs);
      setTickets(data.tickets);
      setMoodEntries(data.moodEntries);
      setDocSearches(data.docSearches);
      setCiProjects(data.ciProjects);
      setArticles(data.knowledgeArticles);
      
      if (data.settings?.theme) {
        setTheme(data.settings.theme);
        document.documentElement.classList.toggle('light', data.settings.theme === 'light');
        localStorage.setItem('devflow-theme', data.settings.theme);
      }
      
      setShowImportModal(false);
      setImportData('');
      showToast('Data imported successfully', 'success');
    } catch (error) {
      showToast('Failed to import data: Invalid format', 'error');
    }
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      setSnippets([]);
      setBugs([]);
      setTickets([]);
      setMoodEntries([]);
      setDocSearches([]);
      setCiProjects([]);
      setArticles([]);
      localStorage.removeItem('devflow-pro');
      showToast('All data has been reset', 'success');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-medium text-lg mb-4">Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Theme</h4>
            <p className="text-sm text-gray-400">Choose between light and dark mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
              theme === 'dark' ? 'bg-violet-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-medium text-lg mb-4">Data Management</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Export Data</h4>
              <p className="text-sm text-gray-400">Download all your data as JSON</p>
            </div>
            <button
              onClick={handleExportData}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-md"
            >
              Export
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Import Data</h4>
              <p className="text-sm text-gray-400">Upload previously exported data</p>
            </div>
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-md"
            >
              Import
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Reset All Data</h4>
              <p className="text-sm text-gray-400">Clear all data and start fresh</p>
            </div>
            <button
              onClick={handleResetData}
              className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-md"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-medium text-lg mb-4">Keyboard Shortcuts</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Command Palette</span>
            <kbd className="bg-gray-700 px-2 py-1 rounded text-sm">Cmd/Ctrl + K</kbd>
          </div>
          <div className="flex justify-between">
            <span>New Snippet</span>
            <kbd className="bg-gray-700 px-2 py-1 rounded text-sm">Cmd/Ctrl + N</kbd>
          </div>
          <div className="flex justify-between">
            <span>Close Modal</span>
            <kbd className="bg-gray-700 px-2 py-1 rounded text-sm">Esc</kbd>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg">Import Data</h3>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Paste JSON Data</label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 h-48"
                  placeholder="Paste your exported JSON data here..."
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportData}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-md"
                >
                  Import Data
                </button>
              </div>
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
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }>>([]);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('');
  const [commandPaletteIndex, setCommandPaletteIndex] = useState(0);
  const [commandPaletteHistory, setCommandPaletteHistory] = useState<string[]>([]);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  
  // Load data from localStorage on mount
  const [snippets, setSnippets] = useState<Snippet[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('devflow-pro-snippets');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  const [bugs, setBugs] = useState<Bug[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('devflow-pro-bugs');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('devflow-pro-tickets');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('devflow-pro-mood');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  const [docSearches, setDocSearches] = useState<DocSearch[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('devflow-pro-docs');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  const [ciProjects, setCiProjects] = useState<CiProject[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('devflow-pro-cicd');
      return saved ? JSON.parse(saved) : [
        { id: '1', name: 'Frontend', status: 'success', lastBuildTime: 120, commitHash: 'a1b2c3d', commitMessage: 'feat: add new dashboard', buildNumber: 42, environment: 'production', history: [] },
        { id: '2', name: 'Backend', status: 'running', lastBuildTime: 0, commitHash: 'e4f5g6h', commitMessage: 'fix: resolve auth issue', buildNumber: 37, environment: 'staging', history: [] },
        { id: '3', name: 'Mobile', status: 'pending', lastBuildTime: 0, commitHash: 'i7j8k9l', commitMessage: 'chore: update dependencies', buildNumber: 15, environment: 'dev', history: [] },
      ];
    }
    return [];
  });
  
  const [articles, setArticles] = useState<Article[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('devflow-pro-knowledge');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  // Auto-save to localStorage
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('devflow-pro-snippets', JSON.stringify(snippets));
      localStorage.setItem('devflow-pro-bugs', JSON.stringify(bugs));
      localStorage.setItem('devflow-pro-tickets', JSON.stringify(tickets));
      localStorage.setItem('devflow-pro-mood', JSON.stringify(moodEntries));
      localStorage.setItem('devflow-pro-docs', JSON.stringify(docSearches));
      localStorage.setItem('devflow-pro-cicd', JSON.stringify(ciProjects));
      localStorage.setItem('devflow-pro-knowledge', JSON.stringify(articles));
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [snippets, bugs, tickets, moodEntries, docSearches, ciProjects, articles]);
  
  // CI/CD polling simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setCiProjects(prev => {
        const updated = [...prev];
        const randomIndex = Math.floor(Math.random() * updated.length);
        const project = updated[randomIndex];
        
        // Randomly update status
        const statuses: ('success' | 'failed' | 'running' | 'pending')[] = ['success', 'failed', 'running', 'pending'];
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        if (newStatus !== project.status) {
          // Add to history
          const newHistory = [
            { status: project.status, duration: project.lastBuildTime, timestamp: new Date().toISOString() },
            ...project.history.slice(0, 9)
          ];
          
          // Play sound for status changes
          if (newStatus === 'failed') {
            playSound('error');
            showToast(`Build failed for ${project.name}`, 'error');
          } else if (newStatus === 'success') {
            playSound('success');
            showToast(`Build succeeded for ${project.name}`, 'success');
          }
          
          // Update project
          updated[randomIndex] = {
            ...project,
            status: newStatus,
            lastBuildTime: newStatus === 'running' ? 0 : Math.floor(Math.random() * 300) + 30,
            commitHash: Math.random().toString(36).substring(2, 9),
            commitMessage: `feat: update ${Math.floor(Math.random() * 100)}`,
            buildNumber: project.buildNumber + 1,
            history: newHistory
          };
        }
        
        return updated;
      });
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      
      // Escape to close command palette
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
        setCommandPaletteQuery('');
        setCommandPaletteIndex(0);
      }
      
      // Arrow keys in command palette
      if (commandPaletteOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setCommandPaletteIndex(prev => (prev + 1) % getFilteredCommands().length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setCommandPaletteIndex(prev => (prev - 1 + getFilteredCommands().length) % getFilteredCommands().length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          executeCommand(getFilteredCommands()[commandPaletteIndex]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, commandPaletteQuery, commandPaletteIndex]);
  
  // Command palette functions
  const getFilteredCommands = () => {
    const allCommands = [
      // Navigation
      { id: 'nav-dashboard', title: 'Dashboard', category: 'Navigation', action: () => setActiveView('dashboard') },
      { id: 'nav-snippets', title: 'Snippets', category: 'Navigation', action: () => setActiveView('snippets') },
      { id: 'nav-bugs', title: 'Bugs', category: 'Navigation', action: () => setActiveView('bugs') },
      { id: 'nav-sprint', title: 'Sprint', category: 'Navigation', action: () => setActiveView('sprint') },
      { id: 'nav-mood', title: 'Mood', category: 'Navigation', action: () => setActiveView('mood') },
      { id: 'nav-docs', title: 'Documentation', category: 'Navigation', action: () => setActiveView('docs') },
      { id: 'nav-cicd', title: 'CI/CD', category: 'Navigation', action: () => setActiveView('cicd') },
      { id: 'nav-knowledge', title: 'Knowledge Base', category: 'Navigation', action: () => setActiveView('knowledge') },
      { id: 'nav-settings', title: 'Settings', category: 'Navigation', action: () => setActiveView('settings') },
      // Actions
      { id: 'action-new-snippet', title: 'New Snippet', category: 'Actions', action: () => { setActiveView('snippets'); showToast('New snippet form opened', 'info'); } },
      { id: 'action-new-bug', title: 'New Bug', category: 'Actions', action: () => { setActiveView('bugs'); showToast('New bug form opened', 'info'); } },
      { id: 'action-new-ticket', title: 'New Ticket', category: 'Actions', action: () => { setActiveView('sprint'); showToast('New ticket form opened', 'info'); } },
      { id: 'action-check-mood', title: 'Check Mood', category: 'Actions', action: () => { setActiveView('mood'); showToast('Mood check-in opened', 'info'); } },
      { id: 'action-search-docs', title: 'Search Documentation', category: 'Actions', action: () => { setActiveView('docs'); showToast('Documentation search opened', 'info'); } },
      { id: 'action-new-article', title: 'New Article', category: 'Actions', action: () => { setActiveView('knowledge'); showToast('New article form opened', 'info'); } },
      { id: 'action-toggle-theme', title: 'Toggle Theme', category: 'Actions', action: () => { document.documentElement.classList.toggle('light'); showToast('Theme toggled', 'info'); } },
      { id: 'action-export-data', title: 'Export Data', category: 'Actions', action: () => { /* Export functionality */ } },
    ];
    
    // Add recent commands
    recentCommands.forEach(cmd => {
      if (!allCommands.find(c => c.id === cmd)) {
        allCommands.unshift({ id: cmd, title: cmd, category: 'Recent', action: () => { /* Execute recent command */ } });
      }
    });
    
    // Filter based on query
    if (!commandPaletteQuery) return allCommands;
    
    return allCommands.filter(cmd => 
      cmd.title.toLowerCase().includes(commandPaletteQuery.toLowerCase()) ||
      cmd.category.toLowerCase().includes(commandPaletteQuery.toLowerCase())
    );
  };
  
  const executeCommand = (command: { id: string; title: string; category: string; action: () => void }) => {
    setCommandPaletteOpen(false);
    setCommandPaletteQuery('');
    setCommandPaletteIndex(0);
    
    // Add to recent commands
    setRecentCommands(prev => [command.id, ...prev.filter(id => id !== command.id)].slice(0, 5));
    
    // Execute command
    command.action();
  };
  
  // Toast functions
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, type, message }]);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };
  
  // Render active view
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'snippets':
        return <SnippetManager />;
      case 'bugs':
        return <BugTracker />;
      case 'sprint':
        return <SprintKanban />;
      case 'mood':
        return <MoodTracker />;
      case 'docs':
        return <DocumentationFinder />;
      case 'cicd':
        return <CICDMonitor />;
      case 'knowledge':
        return <KnowledgeBase />;
      case 'settings':
        return <Settings />;
      default:
        return <DashboardView />;
    }
  };
  
  // Sidebar navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'snippets', label: 'Snippets', icon: Code },
    { id: 'bugs', label: 'Bugs', icon: Bug },
    { id: 'sprint', label: 'Sprint', icon: Calendar },
    { id: 'mood', label: 'Mood', icon: Smile },
    { id: 'docs', label: 'Docs', icon: BookOpen },
    { id: 'cicd', label: 'CI/CD', icon: Activity },
    { id: 'knowledge', label: 'Knowledge', icon: BookMarked },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  
  return (
    <div className={`min-h-screen flex ${document.documentElement.classList.contains('light') ? 'light' : ''}`}>
      {/* Sidebar */}
      <div className={`bg-gray-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'} flex flex-col`}>
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            {sidebarOpen && <h1 className="text-xl font-bold">DevFlow Pro</h1>}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded hover:bg-gray-800"
            >
              {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={`flex items-center w-full px-4 py-3 text-left transition-colors ${
                activeView === item.id 
                  ? 'bg-violet-900 text-violet-100 border-l-4 border-violet-500' 
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <item.icon className="flex-shrink-0" size={20} />
              {sidebarOpen && <span className="ml-3">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold capitalize">
              {activeView === 'dashboard' ? 'Dashboard' : navItems.find(item => item.id === activeView)?.label}
            </h2>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setCommandPaletteOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Search size={20} />
                <span className="sr-only">Command Palette (Cmd+K)</span>
              </button>
              <button 
                onClick={() => document.documentElement.classList.toggle('light')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {document.documentElement.classList.contains('light') ? <Moon size={20} /> : <Sun size={20} />}
                <span className="sr-only">Toggle Theme</span>
              </button>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          {renderActiveView()}
        </main>
      </div>
      
      {/* Command Palette */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Search className="text-gray-400 mr-2" size={20} />
                <input
                  type="text"
                  value={commandPaletteQuery}
                  onChange={(e) => {
                    setCommandPaletteQuery(e.target.value);
                    setCommandPaletteIndex(0);
                  }}
                  placeholder="Type a command..."
                  className="flex-1 bg-transparent outline-none text-lg"
                  autoFocus
                />
                <button 
                  onClick={() => setCommandPaletteOpen(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {getFilteredCommands().length === 0 ? (
                <div className="p-4 text-gray-500 text-center">No commands found</div>
              ) : (
                getFilteredCommands().map((command, index) => (
                  <button
                    key={command.id}
                    onClick={() => executeCommand(command)}
                    className={`flex items-center w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      index === commandPaletteIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{command.title}</div>
                      <div className="text-sm text-gray-500">{command.category}</div>
                    </div>
                    {index === commandPaletteIndex && <Check size={20} className="text-violet-500" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm transform transition-all duration-300 ${
              toast.type === 'success' ? 'border-l-4 border-green-500' :
              toast.type === 'error' ? 'border-l-4 border-red-500' :
              toast.type === 'warning' ? 'border-l-4 border-yellow-500' :
              'border-l-4 border-blue-500'
            }`}
          >
            <div className="flex items-center">
              {toast.type === 'success' && <CheckCircle className="text-green-500 mr-2" size={20} />}
              {toast.type === 'error' && <XCircle className="text-red-500 mr-2" size={20} />}
              {toast.type === 'warning' && <AlertTriangle className="text-yellow-500 mr-2" size={20} />}
              {toast.type === 'info' && <Info className="text-blue-500 mr-2" size={20} />}
              <span>{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}