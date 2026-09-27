"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Code, Bug, Calendar, Smile, Search, Activity, Book, Settings, Plus, Trash2, Edit, X, Check, AlertCircle, Filter, Copy, CalendarDays, TrendingUp, BarChart3, Clock, Users, Bookmark, Star, GitBranch, Zap, FileText, Folder, Tag, Hash, ChevronDown, ChevronUp, Menu, Moon, Sun, Download, Upload, RotateCcw, CheckCircle, XCircle, AlertTriangle, Info, ChevronLeft, ChevronRight, LayoutDashboard, Inbox, Brain, BookOpen } from "lucide-react";
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
  assignedTo?: string;
};

type Ticket = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high';
  storyPoints: number;
  labels: string[];
  column: string;
  createdAt: string;
  updatedAt: string;
};

type MoodEntry = {
  id: string;
  date: string;
  mood: '😊' | '🙃' | '😐' | '😕' | '😢';
  note?: string;
  userId: string;
};

type DocumentationResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  lastUpdated: string;
  category: string;
  isBookmarked: boolean;
  content?: string;
};

type BuildStatus = 'success' | 'failed' | 'running' | 'pending';
type Project = {
  id: string;
  name: string;
  status: BuildStatus;
  lastBuildTime: number; // in seconds
  commitHash: string;
  commitMessage: string;
  buildNumber: number;
  environment: 'dev' | 'staging' | 'production';
  history: Array<{
    status: BuildStatus;
    duration: number;
    timestamp: string;
  }>;
};

type KnowledgeArticle = {
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
};

type Command = {
  id: string;
  title: string;
  category: 'navigation' | 'actions' | 'recent';
  action: () => void;
  shortcut: string;
};

type Toast = {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
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
        oscillator.start(audioContext.currentTime + 0.1);
        oscillator.stop(audioContext.currentTime + 0.1);
        oscillator.frequency.value = 660;
        oscillator.start(audioContext.currentTime + 0.15);
        oscillator.stop(audioContext.currentTime + 0.25);
        break;
    }
  } catch (e) {
    console.error('Web Audio API not supported:', e);
  }
};

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error loading from localStorage:`, e);
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving to localStorage:`, e);
  }
};

const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'MMM dd, yyyy');
};

const formatDateTime = (dateString: string) => {
  return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const highlightSyntax = (code: string, language: string) => {
  // Simple syntax highlighting with Tailwind classes
  const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'return', 'class', 'import', 'export', 'async', 'await'];
  const highlightedCode = code
    .replace(/(\bfunction\b)/g, '<span class="text-purple-500">$1</span>')
    .replace(/(\bconst\b|\blet\b|\bvar\b)/g, '<span class="text-blue-500">$1</span>')
    .replace(/(\bif\b|\belse\b|\breturn\b)/g, '<span class="text-green-500">$1</span>')
    .replace(/(\bclass\b)/g, '<span class="text-yellow-500">$1</span>')
    .replace(/(\bimport\b|\bexport\b)/g, '<span class="text-pink-500">$1</span>')
    .replace(/(\basync\b|\bawait\b)/g, '<span class="text-indigo-500">$1</span>');
  
  return (
    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
      <code 
        className={`language-${language.toLowerCase()}`} 
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
    </pre>
  );
};

const renderMarkdown = (markdown: string) => {
  return marked.parse(markdown);
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  return true;
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Feature 1: Code Snippet Manager
const CodeSnippetManager = ({ 
  snippets, 
  setSnippets, 
  searchQuery, 
  setSearchQuery, 
  languageFilter, 
  setLanguageFilter,
  showToast 
}: {
  snippets: Snippet[];
  setSnippets: (snippets: Snippet[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  languageFilter: 'All' | 'JavaScript' | 'TypeScript' | 'Python';
  setLanguageFilter: (filter: 'All' | 'JavaScript' | 'TypeScript' | 'Python') => void;
  showToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void;
}) => {
  const [newSnippet, setNewSnippet] = useState<Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    language: 'JavaScript',
    code: '',
    tags: [],
    description: ''
  });
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  
  const filteredSnippets = useMemo(() => {
    return snippets.filter(snippet => {
      const matchesSearch = !searchQuery || 
        snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snippet.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        snippet.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snippet.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesLanguage = languageFilter === 'All' || snippet.language === languageFilter;
      
      return matchesSearch && matchesLanguage;
    });
  }, [snippets, searchQuery, languageFilter]);
  
  const handleAddSnippet = () => {
    if (!newSnippet.title.trim() || !newSnippet.code.trim()) {
      showToast({ type: 'warning', message: 'Title and code are required' });
      return;
    }
    
    const snippet: Snippet = {
      id: generateId(),
      ...newSnippet,
      tags: newSnippet.tags.filter(tag => tag.trim() !== ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setSnippets([...snippets, snippet]);
    setNewSnippet({
      title: '',
      language: 'JavaScript',
      code: '',
      tags: [],
      description: ''
    });
    setShowAddForm(false);
    setTagInput('');
    showToast({ type: 'success', message: 'Snippet saved successfully' });
    playSound('success');
  };
  
  const handleEditSnippet = (id: string) => {
    const snippet = snippets.find(s => s.id === id);
    if (snippet) {
      setEditingId(id);
      setNewSnippet({
        title: snippet.title,
        language: snippet.language,
        code: snippet.code,
        tags: [...snippet.tags],
        description: snippet.description
      });
      setShowAddForm(true);
    }
  };
  
  const handleUpdateSnippet = () => {
    if (!newSnippet.title.trim() || !newSnippet.code.trim() || !editingId) {
      showToast({ type: 'warning', message: 'Title and code are required' });
      return;
    }
    
    setSnippets(snippets.map(snippet => 
      snippet.id === editingId 
        ? { 
            ...snippet, 
            ...newSnippet, 
            tags: newSnippet.tags.filter(tag => tag.trim() !== ''),
            updatedAt: new Date().toISOString()
          }
        : snippet
    ));
    
    setEditingId(null);
    setNewSnippet({
      title: '',
      language: 'JavaScript',
      code: '',
      tags: [],
      description: ''
    });
    setShowAddForm(false);
    setTagInput('');
    showToast({ type: 'success', message: 'Snippet updated successfully' });
    playSound('success');
  };
  
  const handleDeleteSnippet = (id: string) => {
    if (confirm('Are you sure you want to delete this snippet?')) {
      setSnippets(snippets.filter(snippet => snippet.id !== id));
      showToast({ type: 'success', message: 'Snippet deleted' });
      playSound('alert');
    }
  };
  
  const handleAddTag = () => {
    if (tagInput.trim() && !newSnippet.tags.includes(tagInput.trim())) {
      setNewSnippet({
        ...newSnippet,
        tags: [...newSnippet.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tag: string) => {
    setNewSnippet({
      ...newSnippet,
      tags: newSnippet.tags.filter(t => t !== tag)
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Code Snippets</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {editingId ? 'Edit Snippet' : 'New Snippet'}
        </button>
      </div>
      
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Snippet' : 'Add New Snippet'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={newSnippet.title}
                onChange={(e) => setNewSnippet({...newSnippet, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Snippet title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
              <select
                value={newSnippet.language}
                onChange={(e) => setNewSnippet({...newSnippet, language: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="JavaScript">JavaScript</option>
                <option value="TypeScript">TypeScript</option>
                <option value="Python">Python</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
              <textarea
                value={newSnippet.code}
                onChange={(e) => setNewSnippet({...newSnippet, code: e.target.value})}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
                placeholder="Paste your code here"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Add a tag"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newSnippet.tags.map((tag, index) => (
                  <span key={index} className="inline-flex items-center gap-1 bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 px-2 py-1 rounded-md text-sm">
                    {tag}
                    <button 
                      onClick={() => handleRemoveTag(tag)}
                      className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Markdown)</label>
              <textarea
                value={newSnippet.description}
                onChange={(e) => setNewSnippet({...newSnippet, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Describe your snippet (supports Markdown)"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={editingId ? handleUpdateSnippet : handleAddSnippet}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors"
              >
                {editingId ? 'Update Snippet' : 'Add Snippet'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  setNewSnippet({
                    title: '',
                    language: 'JavaScript',
                    code: '',
                    tags: [],
                    description: ''
                  });
                  setTagInput('');
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Search snippets..."
            />
          </div>
        </div>
        
        <div className="w-full sm:w-48">
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="All">All Languages</option>
            <option value="JavaScript">JavaScript</option>
            <option value="TypeScript">TypeScript</option>
            <option value="Python">Python</option>
          </select>
        </div>
      </div>
      
      {filteredSnippets.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="text-5xl mb-4">💻</div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No snippets found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery || languageFilter !== 'All' 
              ? 'Try adjusting your search or filter' 
              : 'Save your first snippet to build your library'
            }
          </p>
          {!searchQuery && languageFilter === 'All' && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors"
            >
              Add Your First Snippet
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSnippets.map((snippet) => (
            <div key={snippet.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">{snippet.title}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditSnippet(snippet.id)}
                      className="p-1 text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSnippet(snippet.id)}
                      className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-md">
                    {snippet.language}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {snippet.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 text-xs rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Description:</div>
                  {snippet.description ? (
                    <div 
                      className="text-gray-700 dark:text-gray-300 text-sm prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(snippet.description) }}
                    />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">No description</p>
                  )}
                </div>
                
                <div className="mb-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Code:</div>
                  <div className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded-md overflow-x-auto max-h-32">
                    <pre className="text-gray-800 dark:text-gray-200 font-mono">{snippet.code}</pre>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => copyToClipboard(snippet.code)}
                    className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </button>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Updated {formatDistanceToNow(new Date(snippet.updatedAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Feature 2: Bug Tracker
const BugTracker = ({ 
  bugs, 
  setBugs, 
  showToast 
}: {
  bugs: Bug[];
  setBugs: (bugs: Bug[]) => void;
  showToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void;
}) => {
  const [newBug, setNewBug] = useState<Omit<Bug, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    description: '',
    severity: 'major',
    status: 'open',
    category: 'ui'
  });
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<'all' | Bug['severity']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Bug['status']>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Bug['category']>('all');
  
  const filteredBugs = useMemo(() => {
    return bugs.filter(bug => {
      const matchesSeverity = severityFilter === 'all' || bug.severity === severityFilter;
      const matchesStatus = statusFilter === 'all' || bug.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || bug.category === categoryFilter;
      
      return matchesSeverity && matchesStatus && matchesCategory;
    });
  }, [bugs, severityFilter, statusFilter, categoryFilter]);
  
  const bugStats = useMemo(() => {
    const severityCounts = {
      critical: bugs.filter(b => b.severity === 'critical').length,
      major: bugs.filter(b => b.severity === 'major').length,
      minor: bugs.filter(b => b.severity === 'minor').length,
      cosmetic: bugs.filter(b => b.severity === 'cosmetic').length
    };
    
    // Create trend data for the last 14 days
    const today = new Date();
    const trendData = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const created = bugs.filter(b => b.createdAt.startsWith(dateStr)).length;
      const resolved = bugs.filter(b => b.status === 'resolved' && b.updatedAt.startsWith(dateStr)).length;
      
      trendData.push({
        date: format(date, 'MMM dd'),
        created,
        resolved
      });
    }
    
    return { severityCounts, trendData };
  }, [bugs]);
  
  const handleAddBug = () => {
    if (!newBug.title.trim() || !newBug.description.trim()) {
      showToast({ type: 'warning', message: 'Title and description are required' });
      return;
    }
    
    const bug: Bug = {
      id: generateId(),
      ...newBug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setBugs([...bugs, bug]);
    setNewBug({
      title: '',
      description: '',
      severity: 'major',
      status: 'open',
      category: 'ui'
    });
    setShowAddForm(false);
    
    // Play alert sound for critical bugs
    if (bug.severity === 'critical') {
      playSound('alert');
      showToast({ type: 'error', message: 'Critical bug added!' });
    } else {
      showToast({ type: 'success', message: 'Bug added successfully' });
    }
  };
  
  const handleUpdateBug = (id: string, updates: Partial<Bug>) => {
    setBugs(bugs.map(bug => 
      bug.id === id 
        ? { 
            ...bug, 
            ...updates, 
            updatedAt: new Date().toISOString()
          }
        : bug
    ));
    
    if (updates.severity === 'critical') {
      playSound('alert');
      showToast({ type: 'error', message: 'Critical bug updated!' });
    } else {
      showToast({ type: 'success', message: 'Bug updated successfully' });
    }
  };
  
  const handleDeleteBug = (id: string) => {
    if (confirm('Are you sure you want to delete this bug?')) {
      setBugs(bugs.filter(bug => bug.id !== id));
      showToast({ type: 'success', message: 'Bug deleted' });
    }
  };
  
  const getSeverityColor = (severity: Bug['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'major': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'minor': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cosmetic': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  const getStatusColor = (status: Bug['status']) => {
    switch (status) {
      case 'open': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };
  
  const getCategoryColor = (category: Bug['category']) => {
    switch (category) {
      case 'ui': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'logic': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'performance': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      case 'security': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Bug Tracker</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Bug
        </button>
      </div>
      
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Add New Bug</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={newBug.title}
                onChange={(e) => setNewBug({...newBug, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Bug title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={newBug.description}
                onChange={(e) => setNewBug({...newBug, description: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Describe the bug"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
                <select
                  value={newBug.severity}
                  onChange={(e) => setNewBug({...newBug, severity: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="critical">Critical</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="cosmetic">Cosmetic</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={newBug.status}
                  onChange={(e) => setNewBug({...newBug, status: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={newBug.category}
                  onChange={(e) => setNewBug({...newBug, category: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                onClick={handleAddBug}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors"
              >
                Add Bug
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewBug({
                    title: '',
                    description: '',
                    severity: 'major',
                    status: 'open',
                    category: 'ui'
                  });
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Bugs</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{bugs.length}</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Critical</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{bugStats.severityCounts.critical}</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Open</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{bugs.filter(b => b.status === 'open').length}</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Resolved</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{bugs.filter(b => b.status === 'resolved').length}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Severity Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Critical', count: bugStats.severityCounts.critical },
                { name: 'Major', count: bugStats.severityCounts.major },
                { name: 'Minor', count: bugStats.severityCounts.minor },
                { name: 'Cosmetic', count: bugStats.severityCounts.cosmetic }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Bug Trends (14 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bugStats.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="created" stroke="#ef4444" name="Created" />
                <Line type="monotone" dataKey="resolved" stroke="#22c55e" name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
            <option value="cosmetic">Cosmetic</option>
          </select>
        </div>
        
        <div className="flex-1">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        
        <div className="flex-1">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Categories</option>
            <option value="ui">UI</option>
            <option value="logic">Logic</option>
            <option value="performance">Performance</option>
            <option value="security">Security</option>
          </select>
        </div>
      </div>
      
      {filteredBugs.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="text-5xl mb-4">🐞</div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No bugs tracked</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Add one to start tracking issues in your project</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors"
          >
            Add Your First Bug
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBugs.map((bug) => (
            <div key={bug.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">{bug.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(bug.severity)}`}>
                    {bug.severity}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(bug.status)}`}>
                    {bug.status}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(bug.category)}`}>
                    {bug.category}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleUpdateBug(bug.id, { status: bug.status === 'open' ? 'in-progress' : 'open' })}
                    className="p-1 text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400"
                    title={bug.status === 'open' ? 'Start Progress' : 'Reopen'}
                  >
                    {bug.status === 'open' ? <Play className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleUpdateBug(bug.id, { status: bug.status === 'resolved' ? 'open' : 'resolved' })}
                    className="p-1 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                    title={bug.status === 'resolved' ? 'Reopen' : 'Resolve'}
                  >
                    {bug.status === 'resolved' ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteBug(bug.id)}
                    className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 mb-3">{bug.description}</p>
              
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Created {formatDistanceToNow(new Date(bug.createdAt), { addSuffix: true })}
                {bug.updatedAt !== bug.createdAt && (
                  <span>, updated {formatDistanceToNow(new Date(bug.updatedAt), { addSuffix: true })}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};





export default function Home() {
  // State management
  const [activeView, setActiveView] = useState<'dashboard' | 'snippets' | 'bugs' | 'sprint' | 'mood' | 'docs' | 'cicd' | 'knowledge' | 'settings'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }>>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  
  // Mock data for demonstration
  const [snippets, setSnippets] = useState<Array<any>>([]);
  const [bugs, setBugs] = useState<Array<any>>([]);
  const [tickets, setTickets] = useState<Array<any>>([]);
  const [moodEntries, setMoodEntries] = useState<Array<any>>([]);
  const [docSearches, setDocSearches] = useState<Array<any>>([]);
  const [cicdProjects, setCicdProjects] = useState<Array<any>>([
    { name: 'Frontend', status: 'success', lastBuildTime: 45, commitHash: 'a1b2c3d', commitMessage: 'feat: add new dashboard', buildNumber: 42, environment: 'production' },
    { name: 'Backend', status: 'running', lastBuildTime: 120, commitHash: 'e4f5g6h', commitMessage: 'fix: resolve auth issue', buildNumber: 38, environment: 'staging' },
    { name: 'Mobile', status: 'pending', lastBuildTime: 0, commitHash: 'i7j8k9l', commitMessage: 'chore: update dependencies', buildNumber: 15, environment: 'dev' }
  ]);
  const [knowledgeArticles, setKnowledgeArticles] = useState<Array<any>>([]);
  
  // Command palette state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  
  // Navigation commands
  const navigationCommands = [
    { id: 'dashboard', title: 'Dashboard', category: 'navigation' },
    { id: 'snippets', title: 'Snippets', category: 'navigation' },
    { id: 'bugs', title: 'Bugs', category: 'navigation' },
    { id: 'sprint', title: 'Sprint', category: 'navigation' },
    { id: 'mood', title: 'Mood', category: 'navigation' },
    { id: 'docs', title: 'Documentation', category: 'navigation' },
    { id: 'cicd', title: 'CI/CD', category: 'navigation' },
    { id: 'knowledge', title: 'Knowledge', category: 'navigation' },
    { id: 'settings', title: 'Settings', category: 'navigation' }
  ];
  
  // Action commands
  const actionCommands = [
    { id: 'new-snippet', title: 'New Snippet', category: 'actions' },
    { id: 'new-bug', title: 'New Bug', category: 'actions' },
    { id: 'new-ticket', title: 'New Ticket', category: 'actions' },
    { id: 'check-mood', title: 'Check Mood', category: 'actions' },
    { id: 'search-docs', title: 'Search Documentation', category: 'actions' },
    { id: 'new-article', title: 'New Article', category: 'actions' },
    { id: 'toggle-theme', title: 'Toggle Theme', category: 'actions' },
    { id: 'export-data', title: 'Export Data', category: 'actions' }
  ];
  
  // Combined commands for palette
  const allCommands = [...navigationCommands, ...actionCommands];
  
  // Filter commands based on search query
  const filteredCommands = allCommands.filter(command => 
    command.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle command execution
  const handleCommandExecute = (command: any) => {
    // Add to recent commands
    setRecentCommands(prev => [command.id, ...prev.slice(0, 4)]);
    
    // Execute command
    switch (command.id) {
      case 'dashboard':
        setActiveView('dashboard');
        break;
      case 'snippets':
        setActiveView('snippets');
        break;
      case 'bugs':
        setActiveView('bugs');
        break;
      case 'sprint':
        setActiveView('sprint');
        break;
      case 'mood':
        setActiveView('mood');
        break;
      case 'docs':
        setActiveView('docs');
        break;
      case 'cicd':
        setActiveView('cicd');
        break;
      case 'knowledge':
        setActiveView('knowledge');
        break;
      case 'settings':
        setActiveView('settings');
        break;
      case 'new-snippet':
        setActiveView('snippets');
        showToast('success', 'Create a new snippet');
        break;
      case 'new-bug':
        setActiveView('bugs');
        showToast('success', 'Report a new bug');
        break;
      case 'new-ticket':
        setActiveView('sprint');
        showToast('success', 'Create a new ticket');
        break;
      case 'check-mood':
        setActiveView('mood');
        showToast('info', 'Check in your mood');
        break;
      case 'search-docs':
        setActiveView('docs');
        showToast('info', 'Search documentation');
        break;
      case 'new-article':
        setActiveView('knowledge');
        showToast('success', 'Create a new article');
        break;
      case 'toggle-theme':
        setDarkMode(!darkMode);
        showToast('info', `Switched to ${!darkMode ? 'dark' : 'light'} mode`);
        break;
      case 'export-data':
        showToast('success', 'Data exported successfully');
        break;
    }
    
    setCommandPaletteOpen(false);
    setSearchQuery('');
    setSelectedCommandIndex(0);
  };
  
  // Toast notification system
  const showToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, type, message }]);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };
  
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
        setSearchQuery('');
        setSelectedCommandIndex(0);
      }
      
      // Arrow keys for command palette navigation
      if (commandPaletteOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCommandIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCommandIndex(prev => prev > 0 ? prev - 1 : 0);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredCommands[selectedCommandIndex]) {
            handleCommandExecute(filteredCommands[selectedCommandIndex]);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, filteredCommands, selectedCommandIndex]);
  
  // Render active view
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Total Snippets</h3>
                <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">{snippets.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Open Bugs</h3>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{bugs.filter(b => b.status === 'open').length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Active Sprint Tickets</h3>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{tickets.filter(t => t.status !== 'done').length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Today's Mood</h3>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {moodEntries.length > 0 ? '😊' : 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="bg-violet-100 dark:bg-violet-900 p-2 rounded-full mr-3">
                      <FileText className="text-violet-600 dark:text-violet-400" size={20} />
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white">New snippet added</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="bg-red-100 dark:bg-red-900 p-2 rounded-full mr-3">
                      <Bug className="text-red-600 dark:text-red-400" size={20} />
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white">Bug reported: Login issue</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">
                      <Users className="text-blue-600 dark:text-blue-400" size={20} />
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white">Mood check-in completed</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">3 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { setActiveView('snippets'); showToast('info', 'Create a new snippet'); }}
                    className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <FileText className="text-gray-600 dark:text-gray-300 mb-1" size={20} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">New Snippet</span>
                  </button>
                  <button 
                    onClick={() => { setActiveView('bugs'); showToast('info', 'Report a new bug'); }}
                    className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Bug className="text-gray-600 dark:text-gray-300 mb-1" size={20} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Report Bug</span>
                  </button>
                  <button 
                    onClick={() => { setActiveView('sprint'); showToast('info', 'Create a new ticket'); }}
                    className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Plus className="text-gray-600 dark:text-gray-300 mb-1" size={20} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Add Ticket</span>
                  </button>
                  <button 
                    onClick={() => { setActiveView('mood'); showToast('info', 'Check in your mood'); }}
                    className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Smile className="text-gray-600 dark:text-gray-300 mb-1" size={20} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Check Mood</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'snippets':
        return <CodeSnippetManager />;
      case 'bugs':
        return <BugTracker />;
      case 'sprint':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Sprint Kanban Board</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">Drag and drop tickets between columns</p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {['Backlog', 'To Do', 'In Progress', 'Review', 'Done'].map((column, index) => (
                  <div key={column} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">{column}</h3>
                    <div className="space-y-3">
                      {tickets
                        .filter(ticket => ticket.status === column.toLowerCase().replace(' ', '-'))
                        .map(ticket => (
                          <div key={ticket.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
                            <h4 className="font-medium text-gray-900 dark:text-white">{ticket.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{ticket.description}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                {ticket.priority}
                              </span>
                              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                                {ticket.storyPoints}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'mood':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Team Mood Tracker</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">Check in daily to track your team's mood</p>
              <div className="flex justify-center space-x-4 mb-6">
                {['😊', '🙃', '😐', '😕', '😢'].map((emoji, index) => (
                  <button key={emoji} className="text-3xl hover:scale-110 transition-transform">
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-300">How are you feeling today?</p>
              </div>
            </div>
          </div>
        );
      case 'docs':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Documentation Finder</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {/* Toolkit Integration: This feature simulates the following AgentCraft-Toolkit tools:
              // - duckduckgo_search_tool: Searches the web for documentation
              // - crawl4ai_crawler_tool: Scrapes and extracts content from documentation pages
              // - buzz_sentiment_analyzer_tool: Analyzes sentiment of community discussions about the library */}
              <p className="text-gray-600 dark:text-gray-300 mb-4">Search for any library or API documentation</p>
              <div className="flex mb-6">
                <input 
                  type="text" 
                  placeholder="Search documentation..." 
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white"
                />
                <button className="px-4 py-2 bg-violet-600 text-white rounded-r-lg hover:bg-violet-700">
                  Search
                </button>
              </div>
              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">React Documentation</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">reactjs.org</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">A JavaScript library for building user interfaces...</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Last updated: 2023-05-15</span>
                    <button className="text-xs text-violet-600 dark:text-violet-400 hover:underline">View</button>
                  </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">Next.js Guide</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">nextjs.org</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">The React Framework for Production...</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Last updated: 2023-06-20</span>
                    <button className="text-xs text-violet-600 dark:text-violet-400 hover:underline">View</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'cicd':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">CI/CD Monitor</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {cicdProjects.map(project => (
                <div key={project.name} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      project.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      project.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      project.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Build:</span>
                      <span className="text-gray-900 dark:text-white">#{project.buildNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Commit:</span>
                      <span className="text-gray-900 dark:text-white">{project.commitHash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Message:</span>
                      <span className="text-gray-900 dark:text-white truncate">{project.commitMessage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                      <span className="text-gray-900 dark:text-white">
                        {project.lastBuildTime > 0 ? `${project.lastBuildTime}s` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Environment:</span>
                      <span className="text-gray-900 dark:text-white">{project.environment}</span>
                    </div>
                  </div>
                  <button className="mt-4 w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                    View History
                  </button>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Build History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {cicdProjects.flatMap(project => 
                      Array.from({ length: 3 }, (_, i) => ({
                        project: project.name,
                        status: ['success', 'failed', 'running'][i],
                        duration: Math.floor(Math.random() * 120) + 30,
                        timestamp: new Date(Date.now() - i * 3600000).toISOString()
                      }))
                    ).map((build, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{build.project}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs ${
                            build.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            build.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {build.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{build.duration}s</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDateTime(build.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'knowledge':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Knowledge Base</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">Create and search knowledge articles</p>
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-2">
                  <button className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700">
                    New Article
                  </button>
                  <select className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white">
                    <option>All Categories</option>
                    <option>Onboarding</option>
                    <option>Architecture</option>
                    <option>Runbooks</option>
                    <option>FAQs</option>
                    <option>Best Practices</option>
                  </select>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search articles..." 
                    className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                </div>
              </div>
              <div className="space-y-4">
                {knowledgeArticles.map(article => (
                  <div key={article.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{article.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{article.snippet}</p>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                            {article.category}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(article.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <button className="text-violet-600 dark:text-violet-400 hover:underline">
                        Read
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Appearance</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-900 dark:text-white">Dark Mode</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Toggle dark/light theme</p>
                    </div>
                    <button 
                      onClick={() => setDarkMode(!darkMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${darkMode ? 'bg-violet-600' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
                
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Data Management</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                      Export Data
                    </button>
                    <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                      Import Data
                    </button>
                    <button className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800">
                      Reset All Data
                    </button>
                  </div>
                </div>
                
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Keyboard Shortcuts</h2>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-gray-900 dark:text-white">Command Palette</span>
                        <span className="text-gray-500 dark:text-gray-400">Cmd/Ctrl + K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-900 dark:text-white">New Item</span>
                        <span className="text-gray-500 dark:text-gray-400">Cmd/Ctrl + N</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-900 dark:text-white">Close Dialog</span>
                        <span className="text-gray-500 dark:text-gray-400">Esc</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-900 dark:text-white">Toggle Sidebar</span>
                        <span className="text-gray-500 dark:text-gray-400">Cmd/Ctrl + B</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`p-4 rounded-lg shadow-lg max-w-md transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              toast.type === 'warning' ? 'bg-yellow-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            <div className="flex items-center">
              {toast.type === 'success' && <CheckCircle className="mr-2" size={20} />}
              {toast.type === 'error' && <XCircle className="mr-2" size={20} />}
              {toast.type === 'warning' && <AlertTriangle className="mr-2" size={20} />}
              {toast.type === 'info' && <Info className="mr-2" size={20} />}
              <span>{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Command palette */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedCommandIndex(0);
                  }}
                  placeholder="Type a command or search..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((command, index) => (
                  <div 
                    key={command.id}
                    onClick={() => handleCommandExecute(command)}
                    className={`p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      index === selectedCommandIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        command.category === 'navigation' ? 'bg-violet-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <div className="text-gray-900 dark:text-white">{command.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {command.category === 'navigation' ? 'Navigate to' : 'Action'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No commands found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center">
              <div className="bg-violet-600 p-2 rounded-lg mr-3">
                <Code className="size-6" />
              </div>
              {sidebarOpen && <h1 className="text-xl font-bold">DevFlow Pro</h1>}
            </div>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-4">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'snippets', icon: FileText, label: 'Snippets' },
              { id: 'bugs', icon: Bug, label: 'Bugs' },
              { id: 'sprint', icon: Users, label: 'Sprint' },
              { id: 'mood', icon: Smile, label: 'Mood' },
              { id: 'docs', icon: BookOpen, label: 'Docs' },
              { id: 'cicd', icon: Activity, label: 'CI/CD' },
              { id: 'knowledge', icon: Brain, label: 'Knowledge' },
              { id: 'settings', icon: Settings, label: 'Settings' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`flex items-center w-full px-4 py-3 text-left transition-colors ${
                  activeView === item.id ? 'bg-violet-900 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <item.icon className="size-5 mr-3" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
          
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center text-gray-300 hover:text-white"
            >
              {sidebarOpen ? (
                <>
                  <ChevronLeft className="size-5 mr-3" />
                  <span>Collapse</span>
                </>
              ) : (
                <ChevronRight className="size-5" />
              )}
            </button>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {renderActiveView()}
        </div>
      </div>
    </div>
  );
}
