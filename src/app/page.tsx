"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Home, Code, Bug, Calendar, Smile, Search, Activity, Book, Settings, Plus, Trash2, Edit, X, Check, AlertCircle, Copy, Filter, BarChart3, LineChart, TrendingUp, Clock, GitBranch, Users, FileText, Bookmark, Star, Heart, Zap, ChevronDown, ChevronUp, Menu, Sun, Moon, Download, Upload, RotateCcw } from 'lucide-react';
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
  mood: '😊' | '🙃' | '😐' | '😕' | '😢';
  note?: string;
  date: string;
};

type DocSearchResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  lastUpdated: string;
  category: string;
  isBookmarked: boolean;
};

type BuildStatus = 'success' | 'failed' | 'running' | 'pending';
type CIProject = {
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
  category: 'onboarding' | 'architecture' | 'runbooks' | 'faqs' | 'best-practices';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  versions: Array<{
    content: string;
    timestamp: string;
  }>;
  linkedProjects: string[];
};

type ActivityItem = {
  id: string;
  type: 'snippet' | 'bug' | 'ticket' | 'mood' | 'doc' | 'build' | 'article';
  action: 'created' | 'updated' | 'deleted' | 'resolved';
  title: string;
  timestamp: string;
};

type Command = {
  id: string;
  title: string;
  category: 'navigation' | 'actions' | 'recent';
  action: () => void;
  key?: string;
};

type Toast = {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
};

type Theme = 'light' | 'dark';

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
          const gainNode2 = audioContext.createGain();
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          oscillator2.frequency.value = 660;
          gainNode2.gain.value = 0.3;
          oscillator2.start();
          oscillator2.stop(audioContext.currentTime + 0.1);
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
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error loading from localStorage for key: ${key}`, e);
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
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
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  return true;
};

const sanitizeMarkdown = (markdown: string) => {
  return marked(markdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''));
};

// Feature 1: Code Snippet Manager
const SnippetManager = ({ 
  snippets, 
  setSnippets, 
  searchTerm, 
  setSearchTerm, 
  languageFilter, 
  setLanguageFilter,
  showToast 
}: {
  snippets: Snippet[];
  setSnippets: React.Dispatch<React.SetStateAction<Snippet[]>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  languageFilter: 'All' | 'JavaScript' | 'TypeScript' | 'Python';
  setLanguageFilter: React.Dispatch<React.SetStateAction<'All' | 'JavaScript' | 'TypeScript' | 'Python'>>;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
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
  const [filteredSnippets, setFilteredSnippets] = useState<Snippet[]>([]);

  useEffect(() => {
    let filtered = snippets;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(snippet => 
        snippet.title.toLowerCase().includes(term) ||
        snippet.tags.some(tag => tag.toLowerCase().includes(term)) ||
        snippet.code.toLowerCase().includes(term) ||
        snippet.description.toLowerCase().includes(term)
      );
    }
    
    if (languageFilter !== 'All') {
      filtered = filtered.filter(snippet => snippet.language === languageFilter);
    }
    
    setFilteredSnippets(filtered);
  }, [snippets, searchTerm, languageFilter]);

  const handleAddSnippet = () => {
    if (!newSnippet.title.trim() || !newSnippet.code.trim()) {
      showToast('Title and code are required', 'warning');
      return;
    }
    
    const snippet: Snippet = {
      id: generateId(),
      title: newSnippet.title,
      language: newSnippet.language,
      code: newSnippet.code,
      tags: newSnippet.tags,
      description: newSnippet.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setSnippets(prev => [snippet, ...prev]);
    setNewSnippet({
      title: '',
      language: 'JavaScript',
      code: '',
      tags: [],
      description: ''
    });
    setShowAddForm(false);
    showToast('Snippet saved successfully', 'success');
    playSound('success');
  };

  const handleUpdateSnippet = () => {
    if (!editingId || !newSnippet.title.trim() || !newSnippet.code.trim()) {
      showToast('Title and code are required', 'warning');
      return;
    }
    
    setSnippets(prev => prev.map(snippet => 
      snippet.id === editingId 
        ? { 
            ...snippet, 
            title: newSnippet.title,
            language: newSnippet.language,
            code: newSnippet.code,
            tags: newSnippet.tags,
            description: newSnippet.description,
            updatedAt: new Date().toISOString()
          }
        : snippet
    ));
    
    setNewSnippet({
      title: '',
      language: 'JavaScript',
      code: '',
      tags: [],
      description: ''
    });
    setEditingId(null);
    setShowAddForm(false);
    showToast('Snippet updated successfully', 'success');
    playSound('success');
  };

  const handleEditSnippet = (snippet: Snippet) => {
    setNewSnippet({
      title: snippet.title,
      language: snippet.language,
      code: snippet.code,
      tags: snippet.tags,
      description: snippet.description
    });
    setEditingId(snippet.id);
    setShowAddForm(true);
  };

  const handleDeleteSnippet = (id: string) => {
    if (confirm('Are you sure you want to delete this snippet?')) {
      setSnippets(prev => prev.filter(snippet => snippet.id !== id));
      showToast('Snippet deleted', 'info');
      playSound('alert');
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !newSnippet.tags.includes(tagInput.trim())) {
      setNewSnippet(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewSnippet(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleCopyCode = (code: string) => {
    copyToClipboard(code);
    showToast('Code copied to clipboard', 'success');
    playSound('success');
  };

  const getLanguageColor = (language: string) => {
    switch (language) {
      case 'JavaScript': return 'bg-yellow-100 text-yellow-800';
      case 'TypeScript': return 'bg-blue-100 text-blue-800';
      case 'Python': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Code Snippets</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Snippet
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Snippet' : 'Add New Snippet'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={newSnippet.title}
                onChange={(e) => setNewSnippet(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter snippet title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
              <select
                value={newSnippet.language}
                onChange={(e) => setNewSnippet(prev => ({ ...prev, language: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                onChange={(e) => setNewSnippet(prev => ({ ...prev, code: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                placeholder="Enter your code here"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Add a tag"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newSnippet.tags.map((tag, index) => (
                  <span key={index} className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-md text-sm">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
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
                onChange={(e) => setNewSnippet(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter description in markdown format"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={editingId ? handleUpdateSnippet : handleAddSnippet}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors"
              >
                {editingId ? 'Update Snippet' : 'Save Snippet'}
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
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search snippets..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        
        <div className="sm:w-48">
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="All">All Languages</option>
            <option value="JavaScript">JavaScript</option>
            <option value="TypeScript">TypeScript</option>
            <option value="Python">Python</option>
          </select>
        </div>
      </div>

      {filteredSnippets.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <Code className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No snippets found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || languageFilter !== 'All' 
              ? 'Try adjusting your search or filter' 
              : 'Save your first snippet to build your library'
            }
          </p>
          {!searchTerm && languageFilter === 'All' && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Snippet
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSnippets.map((snippet) => (
            <div key={snippet.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{snippet.title}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditSnippet(snippet)}
                      className="p-1 text-gray-500 hover:text-violet-600 dark:hover:text-violet-400"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSnippet(snippet.id)}
                      className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${getLanguageColor(snippet.language)}`}>
                    {snippet.language}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(snippet.updatedAt)}
                  </span>
                </div>
                
                <div className="mb-3">
                  <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm overflow-x-auto">
                    <code className="text-gray-800 dark:text-gray-200 font-mono">
                      {snippet.code.length > 150 ? `${snippet.code.substring(0, 150)}...` : snippet.code}
                    </code>
                  </pre>
                </div>
                
                {snippet.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {snippet.tags.map((tag, index) => (
                      <span key={index} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {snippet.description && (
                  <div className="mb-3">
                    <div 
                      className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(snippet.description) }}
                    />
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => handleCopyCode(snippet.code)}
                    className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(snippet.updatedAt), { addSuffix: true })}
                  </span>
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
  setBugs: React.Dispatch<React.SetStateAction<Bug[]>>;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
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
  const [filteredBugs, setFilteredBugs] = useState<Bug[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    let filtered = bugs;
    
    if (severityFilter !== 'all') {
      filtered = filtered.filter(bug => bug.severity === severityFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(bug => bug.status === statusFilter);
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(bug => bug.category === categoryFilter);
    }
    
    setFilteredBugs(filtered);
  }, [bugs, severityFilter, statusFilter, categoryFilter]);

  useEffect(() => {
    // Prepare severity breakdown data
    const severityCounts = {
      critical: bugs.filter(bug => bug.severity === 'critical').length,
      major: bugs.filter(bug => bug.severity === 'major').length,
      minor: bugs.filter(bug => bug.severity === 'minor').length,
      cosmetic: bugs.filter(bug => bug.severity === 'cosmetic').length
    };
    
    setChartData([
      { name: 'Critical', value: severityCounts.critical, color: '#ef4444' },
      { name: 'Major', value: severityCounts.major, color: '#f97316' },
      { name: 'Minor', value: severityCounts.minor, color: '#eab308' },
      { name: 'Cosmetic', value: severityCounts.cosmetic, color: '#22c55e' }
    ]);

    // Prepare trend data (last 14 days)
    const today = new Date();
    const trend = [];
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const created = bugs.filter(bug => 
        new Date(bug.createdAt).toDateString() === date.toDateString()
      ).length;
      
      const resolved = bugs.filter(bug => 
        new Date(bug.updatedAt).toDateString() === date.toDateString() && 
        bug.status === 'resolved'
      ).length;
      
      trend.push({
        date: format(date, 'MMM dd'),
        created,
        resolved
      });
    }
    
    setTrendData(trend);
  }, [bugs]);

  const handleAddBug = () => {
    if (!newBug.title.trim() || !newBug.description.trim()) {
      showToast('Title and description are required', 'warning');
      return;
    }
    
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
    showToast('Bug reported successfully', 'success');
    playSound('success');
    
    // Alert for critical bugs
    if (newBug.severity === 'critical') {
      showToast('CRITICAL bug reported! Immediate attention required.', 'error');
      playSound('alert');
    }
  };

  const handleUpdateBug = (id: string, updates: Partial<Bug>) => {
    setBugs(prev => prev.map(bug => 
      bug.id === id 
        ? { 
            ...bug, 
            ...updates,
            updatedAt: new Date().toISOString()
          }
        : bug
    ));
    showToast('Bug updated successfully', 'success');
    playSound('success');
  };

  const handleDeleteBug = (id: string) => {
    if (confirm('Are you sure you want to delete this bug?')) {
      setBugs(prev => prev.filter(bug => bug.id !== id));
      showToast('Bug deleted', 'info');
      playSound('alert');
    }
  };

  const getSeverityColor = (severity: Bug['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'major': return 'bg-orange-100 text-orange-800';
      case 'minor': return 'bg-yellow-100 text-yellow-800';
      case 'cosmetic': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: Bug['status']) => {
    switch (status) {
      case 'open': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: Bug['category']) => {
    switch (category) {
      case 'ui': return <Activity className="w-4 h-4" />;
      case 'logic': return <Code className="w-4 h-4" />;
      case 'performance': return <TrendingUp className="w-4 h-4" />;
      case 'security': return <AlertCircle className="w-4 h-4" />;
      default: return <Bug className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bug Tracker</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Report Bug
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Report New Bug</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={newBug.title}
                onChange={(e) => setNewBug(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter bug title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={newBug.description}
                onChange={(e) => setNewBug(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe the bug in detail"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
                <select
                  value={newBug.severity}
                  onChange={(e) => setNewBug(prev => ({ ...prev, severity: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="critical">Critical</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="cosmetic">Cosmetic</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={newBug.category}
                  onChange={(e) => setNewBug(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="ui">UI</option>
                  <option value="logic">Logic</option>
                  <option value="performance">Performance</option>
                  <option value="security">Security</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={newBug.status}
                  onChange={(e) => setNewBug(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleAddBug}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors"
              >
                Report Bug
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
            <option value="cosmetic">Cosmetic</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="ui">UI</option>
            <option value="logic">Logic</option>
            <option value="performance">Performance</option>
            <option value="security">Security</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Bug Severity Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Bug Trends (14 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="created" stroke="#8884d8" name="Created" />
                <Line type="monotone" dataKey="resolved" stroke="#82ca9d" name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {filteredBugs.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <Bug className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No bugs tracked</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Add one to start tracking issues</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Report Your First Bug
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBugs.map((bug) => (
            <div key={bug.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(bug.severity)}`}>
                    {bug.severity}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(bug.status)}`}>
                    {bug.status}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    {getCategoryIcon(bug.category)}
                    <span className="capitalize">{bug.category}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleUpdateBug(bug.id, { status: bug.status === 'open' ? 'in-progress' : bug.status === 'in-progress' ? 'resolved' : 'open' })}
                    className="p-1 text-gray-500 hover:text-violet-600 dark:hover:text-violet-400"
                  >
                    {bug.status === 'open' ? <Activity className="w-4 h-4" /> : 
                     bug.status === 'in-progress' ? <Clock className="w-4 h-4" /> : 
                     <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteBug(bug.id)}
                    className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{bug.title}</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">{bug.description}</p>
              
              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <span>Created: {formatDateTime(bug.createdAt)}</span>
                <span>Updated: {formatDateTime(bug.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function DocumentationFinder() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentationResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<DocumentationResult | null>(null);
  const [favorites, setFavorites] = useState<DocumentationResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<DocumentationResult[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSearching, setIsSearching] = useState(false);

  // Mock data for search results
  const mockResults: DocumentationResult[] = [
    {
      id: '1',
      title: 'React Documentation',
      url: 'https://react.dev',
      snippet: 'React is a JavaScript library for building user interfaces. It allows developers to create reusable UI components.',
      lastUpdated: '2023-10-15',
      content: '# React Documentation\n\nReact is a JavaScript library for building user interfaces. It allows developers to create reusable UI components.',
      category: 'frontend',
      tags: ['react', 'javascript', 'ui'],
      sentiment: 'positive'
    },
    {
      id: '2',
      title: 'Next.js API Routes',
      url: 'https://nextjs.org/docs/api-routes',
      snippet: 'API Routes provide a way to build backend functionality within a Next.js application.',
      lastUpdated: '2023-09-20',
      content: '# Next.js API Routes\n\nAPI Routes provide a way to build backend functionality within a Next.js application.',
      category: 'backend',
      tags: ['nextjs', 'api', 'backend'],
      sentiment: 'neutral'
    },
    {
      id: '3',
      title: 'Docker Best Practices',
      url: 'https://docs.docker.com/develop',
      snippet: 'Learn about best practices for writing Dockerfiles and running Docker containers.',
      lastUpdated: '2023-11-01',
      content: '# Docker Best Practices\n\nLearn about best practices for writing Dockerfiles and running Docker containers.',
      category: 'devops',
      tags: ['docker', 'containers', 'devops'],
      sentiment: 'positive'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'frontend', name: 'Frontend' },
    { id: 'backend', name: 'Backend' },
    { id: 'devops', name: 'DevOps' },
    { id: 'database', name: 'Database' }
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchStatus('🔍 Searching with duckduckgo_search_tool...');
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSearchStatus('📄 Scraping with crawl4ai_crawler_tool...');
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setSearchStatus('🧠 Analyzing with buzz_sentiment_analyzer_tool...');
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Filter mock results based on query and category
    const filtered = mockResults.filter(result => {
      const matchesQuery = result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           result.snippet.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || result.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
    
    setSearchResults(filtered);
    setSearchStatus('');
    setIsSearching(false);
    
    // Add to recent searches
    const newRecent = [...filtered.slice(0, 5), ...recentSearches];
    const uniqueRecent = Array.from(new Map(newRecent.map(item => [item.id, item])).values());
    setRecentSearches(uniqueRecent.slice(0, 10));
  };

  const handleBookmark = (result: DocumentationResult) => {
    if (!favorites.some(fav => fav.id === result.id)) {
      setFavorites([...favorites, result]);
      showToast('Added to favorites', 'success');
    }
  };

  const handleRemoveFavorite = (id: string) => {
    setFavorites(favorites.filter(fav => fav.id !== id));
    showToast('Removed from favorites', 'info');
  };

  const handleResultClick = (result: DocumentationResult) => {
    setSelectedResult(result);
  };

  const handleBackToResults = () => {
    setSelectedResult(null);
  };

  const renderSearchResults = () => {
    if (isSearching) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{searchStatus}</p>
        </div>
      );
    }

    if (searchResults.length === 0 && searchQuery) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No results found for "{searchQuery}"</p>
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Search for any library or API documentation</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {searchResults.map(result => (
          <div 
            key={result.id} 
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleResultClick(result)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{result.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{result.snippet}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{result.category}</span>
                  <span>Updated: {formatDate(result.lastUpdated)}</span>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleBookmark(result);
                }}
                className="ml-4 p-2 text-gray-500 hover:text-yellow-500"
              >
                <Star className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFavorites = () => {
    if (favorites.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No favorites yet. Bookmark some search results!</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {favorites.map(result => (
          <div 
            key={result.id} 
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleResultClick(result)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{result.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{result.snippet}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{result.category}</span>
                  <span>Updated: {formatDate(result.lastUpdated)}</span>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFavorite(result.id);
                }}
                className="ml-4 p-2 text-gray-500 hover:text-red-500"
              >
                <Star className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (selectedResult) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={handleBackToResults}
              className="flex items-center text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to results
            </button>
            <button 
              onClick={() => handleBookmark(selectedResult)}
              className="p-2 text-gray-500 hover:text-yellow-500"
            >
              <Star className="w-5 h-5" />
            </button>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedResult.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{selectedResult.category}</span>
            <span>Updated: {formatDate(selectedResult.lastUpdated)}</span>
            <span>URL: <a href={selectedResult.url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300">{selectedResult.url}</a></span>
          </div>
          
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: marked.parse(selectedResult.content) }} />
          </div>
          
          <div className="mt-6 flex flex-wrap gap-2">
            {selectedResult.tags.map(tag => (
              <span key={tag} className="bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 text-xs px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for documentation..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
          >
            Search
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'search' ? 'text-violet-600 border-b-2 border-violet-600 dark:text-violet-400 dark:border-violet-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('search')}
          >
            Search Results
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'favorites' ? 'text-violet-600 border-b-2 border-violet-600 dark:text-violet-400 dark:border-violet-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites
          </button>
        </div>

        {activeTab === 'search' ? renderSearchResults() : renderFavorites()}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documentation Finder</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Recent searches: {recentSearches.length}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Favorites: {favorites.length}</span>
        </div>
      </div>

      {/* Toolkit Integration: This feature simulates the following AgentCraft-Toolkit tools:
        - duckduckgo_search_tool: Searches the web for documentation
        - crawl4ai_crawler_tool: Scrapes and extracts content from documentation pages
        - buzz_sentiment_analyzer_tool: Analyzes sentiment of community discussions about the library
      */}
      
      {renderContent()}
    </div>
  );
};

function CICDMonitor() {
  const [projects, setProjects] = useState<CICDProject[]>([
    {
      id: '1',
      name: 'Frontend',
      status: 'success',
      lastBuildTime: 120,
      commitHash: 'a1b2c3d',
      commitMessage: 'feat: add new dashboard component',
      buildNumber: 42,
      environment: 'production',
      history: [
        { id: '1', status: 'success', duration: 120, timestamp: '2023-11-15T10:30:00Z' },
        { id: '2', status: 'failed', duration: 180, timestamp: '2023-11-14T10:30:00Z' },
        { id: '3', status: 'success', duration: 110, timestamp: '2023-11-13T10:30:00Z' },
      ]
    },
    {
      id: '2',
      name: 'Backend',
      status: 'running',
      lastBuildTime: 90,
      commitHash: 'e4f5g6h',
      commitMessage: 'fix: resolve API timeout issue',
      buildNumber: 38,
      environment: 'staging',
      history: [
        { id: '1', status: 'success', duration: 90, timestamp: '2023-11-15T09:15:00Z' },
        { id: '2', status: 'success', duration: 95, timestamp: '2023-11-14T09:15:00Z' },
        { id: '3', status: 'running', duration: 0, timestamp: '2023-11-13T09:15:00Z' },
      ]
    },
    {
      id: '3',
      name: 'Mobile',
      status: 'pending',
      lastBuildTime: 0,
      commitHash: 'i7j8k9l',
      commitMessage: 'feat: implement push notifications',
      buildNumber: 15,
      environment: 'dev',
      history: [
        { id: '1', status: 'success', duration: 150, timestamp: '2023-11-15T08:45:00Z' },
        { id: '2', status: 'failed', duration: 160, timestamp: '2023-11-14T08:45:00Z' },
        { id: '3', status: 'success', duration: 140, timestamp: '2023-11-13T08:45:00Z' },
      ]
    }
  ]);

  const [uptimeData, setUptimeData] = useState<UptimeDataPoint[]>([
    { date: '2023-11-09', frontend: 99.5, backend: 98.2, mobile: 97.8 },
    { date: '2023-11-10', frontend: 99.8, backend: 99.1, mobile: 98.5 },
    { date: '2023-11-11', frontend: 99.2, backend: 97.5, mobile: 99.0 },
    { date: '2023-11-12', frontend: 99.9, backend: 99.7, mobile: 98.9 },
    { date: '2023-11-13', frontend: 98.7, backend: 98.3, mobile: 97.5 },
    { date: '2023-11-14', frontend: 99.4, backend: 99.0, mobile: 99.2 },
    { date: '2023-11-15', frontend: 99.6, backend: 98.8, mobile: 98.7 },
  ]);

  const [buildTimeData, setBuildTimeData] = useState<BuildTimeDataPoint[]>([
    { date: '2023-11-01', frontend: 120, backend: 90, mobile: 150 },
    { date: '2023-11-02', frontend: 115, backend: 85, mobile: 145 },
    { date: '2023-11-03', frontend: 125, backend: 95, mobile: 155 },
    { date: '2023-11-04', frontend: 110, backend: 80, mobile: 140 },
    { date: '2023-11-05', frontend: 130, backend: 100, mobile: 160 },
    { date: '2023-11-06', frontend: 105, backend: 75, mobile: 135 },
    { date: '2023-11-07', frontend: 135, backend: 105, mobile: 165 },
    { date: '2023-11-08', frontend: 120, backend: 90, mobile: 150 },
    { date: '2023-11-09', frontend: 115, backend: 85, mobile: 145 },
    { date: '2023-11-10', frontend: 125, backend: 95, mobile: 155 },
    { date: '2023-11-11', frontend: 110, backend: 80, mobile: 140 },
    { date: '2023-11-12', frontend: 130, backend: 100, mobile: 160 },
    { date: '2023-11-13', frontend: 105, backend: 75, mobile: 135 },
    { date: '2023-11-14', frontend: 135, backend: 105, mobile: 165 },
  ]);

  const [selectedProject, setSelectedProject] = useState<CICDProject | null>(null);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setProjects(prevProjects => {
        return prevProjects.map(project => {
          // Randomly update one project's status
          if (Math.random() > 0.7) {
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
            const newBuildTime = newStatus === 'success' ? Math.floor(Math.random() * 120) + 60 : 0;
            const newCommitHash = Math.random().toString(36).substring(2, 8);
            const newCommitMessage = ['feat: add new feature', 'fix: resolve bug', 'docs: update documentation', 'refactor: improve code'][Math.floor(Math.random() * 4)];
            const newBuildNumber = project.buildNumber + 1;
            
            // Create new history entry
            const newHistoryEntry = {
              id: generateId(),
              status: newStatus,
              duration: newBuildTime,
              timestamp: new Date().toISOString()
            };
            
            // Update history (keep last 10)
            const newHistory = [newHistoryEntry, ...project.history].slice(0, 10);
            
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

  const handleRollback = () => {
    if (selectedProject) {
      showToast(`Rolling back ${selectedProject.name} to previous build...`, 'info');
      setShowRollbackDialog(false);
      
      // Simulate rollback
      setTimeout(() => {
        showToast(`${selectedProject.name} rolled back successfully!`, 'success');
      }, 2000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      default: return <Circle className="w-5 h-5 text-gray-500" />;
    }
  };

  const renderProjectCard = (project: CICDProject) => (
    <div 
      key={project.id} 
      className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow ${selectedProject?.id === project.id ? 'ring-2 ring-violet-500' : ''}`}
      onClick={() => setSelectedProject(project)}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {project.environment}
            </span>
          </div>
        </div>
        {getStatusIcon(project.status)}
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Build:</span>
          <span className="ml-1 font-medium text-gray-900 dark:text-white">#{project.buildNumber}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Time:</span>
          <span className="ml-1 font-medium text-gray-900 dark:text-white">
            {project.lastBuildTime > 0 ? `${project.lastBuildTime}s` : '-'}
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500 dark:text-gray-400">Commit:</span>
          <span className="ml-1 font-medium text-gray-900 dark:text-white">{project.commitHash}</span>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500 dark:text-gray-400">Message:</span>
          <span className="ml-1 font-medium text-gray-900 dark:text-white">{project.commitMessage}</span>
        </div>
      </div>
    </div>
  );

  const renderProjectDetails = () => {
    if (!selectedProject) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{selectedProject.name}</h2>
            <div className="flex items-center gap-2">
              <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(selectedProject.status)}`}>
                {selectedProject.status}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedProject.environment}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowRollbackDialog(true)}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
          >
            Rollback
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Current Build</h3>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">#{selectedProject.buildNumber}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Build Time</h3>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedProject.lastBuildTime > 0 ? `${selectedProject.lastBuildTime}s` : '-'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Commit Hash</h3>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedProject.commitHash}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Updated</h3>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatDateTime(selectedProject.history[0]?.timestamp)}</p>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Build History</h3>
          <div className="space-y-2">
            {selectedProject.history.map((build, index) => (
              <div key={build.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center gap-3">
                  {getStatusIcon(build.status)}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Build #{selectedProject.buildNumber - index}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatDateTime(build.timestamp)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${build.status === 'success' ? 'text-green-600 dark:text-green-400' : build.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {build.duration > 0 ? `${build.duration}s` : '-'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{build.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="h-64">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Build Time Trend (14 days)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buildTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563' }}
                itemStyle={{ color: '#f9fafb' }}
                labelStyle={{ color: '#d1d5db' }}
              />
              <Legend />
              <Bar dataKey="frontend" fill="#8b5cf6" name="Frontend" />
              <Bar dataKey="backend" fill="#3b82f6" name="Backend" />
              <Bar dataKey="mobile" fill="#10b981" name="Mobile" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CI/CD Monitor</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Updates every 15 seconds
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No builds yet. Updates will appear here every 15 seconds.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map(renderProjectCard)}
          </div>
          
          {selectedProject && renderProjectDetails()}
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Uptime (7 days)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={uptimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" domain={[95, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563' }}
                    itemStyle={{ color: '#f9fafb' }}
                    labelStyle={{ color: '#d1d5db' }}
                    formatter={(value) => [`${value}%`, 'Uptime']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="frontend" stroke="#8b5cf6" name="Frontend" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="backend" stroke="#3b82f6" name="Backend" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="mobile" stroke="#10b981" name="Mobile" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Rollback Confirmation Dialog */}
      {showRollbackDialog && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Confirm Rollback</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to rollback <span className="font-semibold">{selectedProject.name}</span> to the previous build? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRollbackDialog(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleRollback}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function KnowledgeBase() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([
    {
      id: '1',
      title: 'Getting Started with React',
      content: '# Getting Started with React\n\nReact is a JavaScript library for building user interfaces. It allows developers to create reusable UI components.\n\n## Installation\n\nTo get started with React, you need to have Node.js installed. You can create a new React application using Create React App:\n\n```bash\nnpx create-react-app my-app\ncd my-app\nnpm start\n```\n\n## Components\n\nReact applications are built using components. A component is a self-contained piece of UI that has its own state and logic.\n\n```jsx\nfunction Welcome(props) {\n  return <h1>Hello, {props.name}</h1>;\n}\n```\n\n## Props\n\nProps are how you pass data from a parent component to a child component. They are read-only and help make components reusable.\n\n## State\n\nState allows components to change their output over time in response to user actions, network responses, and anything else.',
      category: 'onboarding',
      tags: ['react', 'javascript', 'frontend'],
      lastUpdated: '2023-11-10',
      versions: [
        { id: '1', content: '# Getting Started with React\n\nReact is a JavaScript library for building user interfaces.', timestamp: '2023-11-01' },
        { id: '2', content: '# Getting Started with React\n\nReact is a JavaScript library for building user interfaces. It allows developers to create reusable UI components.', timestamp: '2023-11-05' },
        { id: '3', content: '# Getting Started with React\n\nReact is a JavaScript library for building user interfaces. It allows developers to create reusable UI components.\n\n## Installation\n\nTo get started with React, you need to have Node.js installed. You can create a new React application using Create React App:\n\n```bash\nnpx create-react-app my-app\ncd my-app\nnpm start\n```', timestamp: '2023-11-10' }
      ],
      linkedProjects: ['Frontend']
    },
    {
      id: '2',
      title: 'API Best Practices',
      content: '# API Best Practices\n\n## RESTful Design\n\nA RESTful API follows these principles:\n\n- Use HTTP methods appropriately (GET, POST, PUT, DELETE)\n- Use meaningful status codes\n- Keep endpoints intuitive and consistent\n- Use nouns for resources, not verbs\n- Use plural nouns for collections\n\n## Authentication\n\nAlways secure your API endpoints. Common authentication methods include:\n\n- API Keys\n- OAuth 2.0\n- JWT (JSON Web Tokens)\n\n## Error Handling\n\nProvide clear and consistent error responses:\n\n```json\n{\n  "error": {\n    "code": "INVALID_INPUT",\n    "message": "The provided email address is invalid"\n  }\n}\n```',
      category: 'best-practices',
      tags: ['api', 'backend', 'rest'],
      lastUpdated: '2023-11-08',
      versions: [
        { id: '1', content: '# API Best Practices\n\n## RESTful Design\n\nA RESTful API follows these principles:', timestamp: '2023-10-15' },
        { id: '2', content: '# API Best Practices\n\n## RESTful Design\n\nA RESTful API follows these principles:\n\n- Use HTTP methods appropriately (GET, POST, PUT, DELETE)\n- Use meaningful status codes\n- Keep endpoints intuitive and consistent', timestamp: '2023-10-20' },
        { id: '3', content: '# API Best Practices\n\n## RESTful Design\n\nA RESTful API follows these principles:\n\n- Use HTTP methods appropriately (GET, POST, PUT, DELETE)\n- Use meaningful status codes\n- Keep endpoints intuitive and consistent\n- Use nouns for resources, not verbs\n- Use plural nouns for collections', timestamp: '2023-11-08' }
      ],
      linkedProjects: ['Backend']
    },
    {
      id: '3',
      title: 'Docker Deployment Guide',
      content: '# Docker Deployment Guide\n\n## Creating a Dockerfile\n\nA Dockerfile is a text document that contains all the commands to assemble an image.\n\n```dockerfile\nFROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD ["npm", "start"]\n```\n\n## Building and Running\n\nBuild the image:\n\n```bash\ndocker build -t my-app .\n```\n\nRun the container:\n\n```bash\ndocker run -p 3000:3000 my-app\n```\n\n## Docker Compose\n\nFor multi-container applications, use Docker Compose:\n\n```yaml\nversion: \'3.8\'\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n  db:\n    image: postgres:14\n    environment:\n      POSTGRES_DB: mydb\n      POSTGRES_USER: user\n      POSTGRES_PASSWORD: password\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n\nvolumes:\n  pgdata:\n```',
      category: 'runbooks',
      tags: ['docker', 'deployment', 'devops'],
      lastUpdated: '2023-11-12',
      versions: [
        { id: '1', content: '# Docker Deployment Guide\n\n## Creating a Dockerfile\n\nA Dockerfile is a text document that contains all the commands to assemble an image.', timestamp: '2023-10-01' },
        { id: '2', content: '# Docker Deployment Guide\n\n## Creating a Dockerfile\n\nA Dockerfile is a text document that contains all the commands to assemble an image.\n\n```dockerfile\nFROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD ["npm", "start"]\n```', timestamp: '2023-10-05' },
        { id: '3', content: '# Docker Deployment Guide\n\n## Creating a Dockerfile\n\nA Dockerfile is a text document that contains all the commands to assemble an image.\n\n```dockerfile\nFROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD ["npm", "start"]\n```\n\n## Building and Running\n\nBuild the image:\n\n```bash\ndocker build -t my-app .\n```\n\nRun the container:\n\n```bash\ndocker run -p 3000:3000 my-app\n```\n\n## Docker Compose\n\nFor multi-container applications, use Docker Compose:\n\n```yaml\nversion: \'3.8\'\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n  db:\n    image: postgres:14\n    environment:\n      POSTGRES_DB: mydb\n      POSTGRES_USER: user\n      POSTGRES_PASSWORD: password\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n\nvolumes:\n  pgdata:\n```', timestamp: '2023-11-12' }
      ],
      linkedProjects: ['Backend', 'Frontend']
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [newArticle, setNewArticle] = useState<Omit<KnowledgeArticle, 'id' | 'lastUpdated' | 'versions'>>({
    title: '',
    content: '',
    category: 'onboarding',
    tags: [],
    linkedProjects: []
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'onboarding', name: 'Onboarding' },
    { id: 'architecture', name: 'Architecture' },
    { id: 'runbooks', name: 'Runbooks' },
    { id: 'faqs', name: 'FAQs' },
    { id: 'best-practices', name: 'Best Practices' }
  ];

  const projects = ['Frontend', 'Backend', 'Mobile'];

  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchQuery === '' || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
      lastUpdated: new Date().toISOString().split('T')[0],
      versions: [{
        id: generateId(),
        content: newArticle.content,
        timestamp: new Date().toISOString()
      }],
      linkedProjects: newArticle.linkedProjects
    };

    setArticles([article, ...articles]);
    setNewArticle({
      title: '',
      content: '',
      category: 'onboarding',
      tags: [],
      linkedProjects: []
    });
    setShowCreateForm(false);
    showToast('Article created successfully', 'success');
  };

  const handleUpdateArticle = (id: string, updatedArticle: Partial<KnowledgeArticle>) => {
    setArticles(articles.map(article => {
      if (article.id === id) {
        const updated = {
          ...article,
          ...updatedArticle,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        
        // Add new version if content changed
        if (updatedArticle.content && updatedArticle.content !== article.content) {
          updated.versions = [{
            id: generateId(),
            content: updatedArticle.content,
            timestamp: new Date().toISOString()
          }, ...article.versions];
        }
        
        return updated;
      }
      return article;
    }));
    
    setIsEditing(false);
    setSelectedArticle(null);
    showToast('Article updated successfully', 'success');
  };

  const handleDeleteArticle = (id: string) => {
    setArticles(articles.filter(article => article.id !== id));
    setSelectedArticle(null);
    showToast('Article deleted successfully', 'success');
  };

  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

function ArticleForm({ 
  article, 
  onSubmit, 
  onCancel, 
  categories 
}: { 
  article?: KnowledgeArticle; 
  onSubmit: (article: Omit<KnowledgeArticle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  categories: string[];
}) {
  const [title, setTitle] = useState(article?.title || '');
  const [description, setDescription] = useState(article?.description || '');
  const [content, setContent] = useState(article?.content || '');
  const [category, setCategory] = useState(article?.category || 'Onboarding');
  const [tags, setTags] = useState<string[]>(article?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      content,
      category,
      tags,
    });
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add a tag"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Content (Markdown)
          </label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
        {showPreview ? (
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700 min-h-[200px]">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: marked.parse(content) }} />
            </div>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
            required
          />
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          {article ? 'Update Article' : 'Create Article'}
        </button>
      </div>
    </form>
  );
}

function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [exportData, setExportData] = useState('');

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('devflow-pro-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('devflow-pro-theme', theme);
  }, [theme]);

  const handleExportData = () => {
    const data = {
      snippets: localStorage.getItem('devflow-pro-snippets'),
      bugs: localStorage.getItem('devflow-pro-bugs'),
      sprint: localStorage.getItem('devflow-pro-sprint'),
      mood: localStorage.getItem('devflow-pro-mood'),
      documentation: localStorage.getItem('devflow-pro-documentation'),
      cicd: localStorage.getItem('devflow-pro-cicd'),
      knowledge: localStorage.getItem('devflow-pro-knowledge-articles'),
      theme,
    };
    
    setExportData(JSON.stringify(data, null, 2));
    setShowExportModal(true);
  };

  const handleImportData = () => {
    try {
      const data = JSON.parse(importData);
      
      if (data.snippets) localStorage.setItem('devflow-pro-snippets', data.snippets);
      if (data.bugs) localStorage.setItem('devflow-pro-bugs', data.bugs);
      if (data.sprint) localStorage.setItem('devflow-pro-sprint', data.sprint);
      if (data.mood) localStorage.setItem('devflow-pro-mood', data.mood);
      if (data.documentation) localStorage.setItem('devflow-pro-documentation', data.documentation);
      if (data.cicd) localStorage.setItem('devflow-pro-cicd', data.cicd);
      if (data.knowledge) localStorage.setItem('devflow-pro-knowledge-articles', data.knowledge);
      if (data.theme) setTheme(data.theme);
      
      showToast('Data imported successfully', 'success');
      setShowImportModal(false);
      setImportData('');
      
      // Reload the page to apply all changes
      window.location.reload();
    } catch (error) {
      showToast('Invalid data format', 'error');
    }
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      const keys = [
        'devflow-pro-snippets',
        'devflow-pro-bugs',
        'devflow-pro-sprint',
        'devflow-pro-mood',
        'devflow-pro-documentation',
        'devflow-pro-cicd',
        'devflow-pro-knowledge-articles',
        'devflow-pro-knowledge-favorites',
        'devflow-pro-knowledge-recent',
      ];
      
      keys.forEach(key => localStorage.removeItem(key));
      
      showToast('All data has been reset', 'success');
      setShowResetModal(false);
      
      // Reload the page to apply all changes
      window.location.reload();
    }
  };

  const keyboardShortcuts = [
    { key: 'Cmd/Ctrl + K', action: 'Open command palette' },
    { key: 'Cmd/Ctrl + N', action: 'Create new item' },
    { key: 'Esc', action: 'Close modal/dialog' },
    { key: 'Cmd/Ctrl + S', action: 'Save changes' },
    { key: 'Cmd/Ctrl + F', action: 'Search' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Theme</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose between light and dark mode</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-lg border ${theme === 'light' ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-300 dark:border-gray-600'}`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-lg border ${theme === 'dark' ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-300 dark:border-gray-600'}`}
            >
              Dark
            </button>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Management</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Export Data</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Download all your data as a JSON file</p>
            </div>
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              Export
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Import Data</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Upload a JSON file to restore your data</p>
            </div>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              Import
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Reset All Data</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Permanently delete all your data</p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Keyboard Shortcuts</h2>
        <div className="space-y-3">
          {keyboardShortcuts.map((shortcut, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <span className="text-gray-700 dark:text-gray-300">{shortcut.action}</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Export Data</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Copy the JSON data below and save it to a file for backup or migration.
            </p>
            <textarea
              value={exportData}
              readOnly
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  copyToClipboard(exportData);
                  showToast('Data copied to clipboard', 'success');
                }}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Import Data</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Paste your JSON data below to restore your data. This will replace all existing data.
            </p>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              placeholder="Paste your JSON data here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleImportData}
                disabled={!importData.trim()}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                Import Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Reset All Data</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to permanently delete all your data? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleResetData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article, onSelect, onFavorite, isFavorite, viewMode }: {
  article: KnowledgeArticle;
  onSelect: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
  viewMode: 'list' | 'grid';
}) {
  const readingTime = getReadingTime(article.content);
  
  if (viewMode === 'grid') {
    return (
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={onSelect}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{article.title}</h3>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {article.content.substring(0, 100)}...
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{article.category}</span>
          <span>{readingTime} min read</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {article.tags.slice(0, 2).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
              {tag}
            </span>
          ))}
          {article.tags.length > 2 && (
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
              +{article.tags.length - 2}
            </span>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">{article.title}</h3>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
        </button>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {article.content.substring(0, 150)}...
      </p>
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{article.category}</span>
        <span>{readingTime} min read</span>
        <span>{formatDate(article.updatedAt)}</span>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {article.tags.map(tag => (
          <span key={tag} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// Article Form Component

// Settings Component

// Main Home Component
export default function Home() {
  // State management
  const [activeView, setActiveView] = useState<'dashboard' | 'snippets' | 'bugs' | 'sprint' | 'mood' | 'docs' | 'cicd' | 'knowledge' | 'settings'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }>>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommand, setSelectedCommand] = useState(0);
  
  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'snippets', label: 'Snippets', icon: Code },
    { id: 'bugs', label: 'Bugs', icon: Bug },
    { id: 'sprint', label: 'Sprint', icon: Kanban },
    { id: 'mood', label: 'Mood', icon: Smile },
    { id: 'docs', label: 'Docs', icon: BookOpen },
    { id: 'cicd', label: 'CI/CD', icon: Activity },
    { id: 'knowledge', label: 'Knowledge', icon: BookMarked },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Command palette commands
  const commands = [
    ...navItems.map(item => ({ id: `nav-${item.id}`, label: `Go to ${item.label}`, category: 'navigation' })),
    { id: 'action-new-snippet', label: 'New Snippet', category: 'actions' },
    { id: 'action-new-bug', label: 'New Bug', category: 'actions' },
    { id: 'action-new-ticket', label: 'New Ticket', category: 'actions' },
    { id: 'action-check-mood', label: 'Check Mood', category: 'actions' },
    { id: 'action-search-docs', label: 'Search Docs', category: 'actions' },
    { id: 'action-new-article', label: 'New Article', category: 'actions' },
    { id: 'action-toggle-theme', label: 'Toggle Theme', category: 'actions' },
    { id: 'action-export-data', label: 'Export Data', category: 'actions' },
    ...recentCommands.map((cmd, i) => ({ id: `recent-${i}`, label: cmd, category: 'recent' })),
  ];

  // Filter commands based on search query
  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle command execution
  const handleCommandExecute = (cmdId: string) => {
    // Add to recent commands
    const commandLabel = commands.find(cmd => cmd.id === cmdId)?.label || '';
    setRecentCommands(prev => [commandLabel, ...prev.slice(0, 4)]);
    
    // Execute command
    if (cmdId.startsWith('nav-')) {
      const view = cmdId.replace('nav-', '');
      setActiveView(view as any);
    } else if (cmdId === 'action-new-snippet') {
      setActiveView('snippets');
      // Trigger new snippet action
    } else if (cmdId === 'action-new-bug') {
      setActiveView('bugs');
      // Trigger new bug action
    } else if (cmdId === 'action-new-ticket') {
      setActiveView('sprint');
      // Trigger new ticket action
    } else if (cmdId === 'action-check-mood') {
      setActiveView('mood');
      // Trigger mood check-in
    } else if (cmdId === 'action-search-docs') {
      setActiveView('docs');
      // Trigger search
    } else if (cmdId === 'action-new-article') {
      setActiveView('knowledge');
      // Trigger new article
    } else if (cmdId === 'action-toggle-theme') {
      setDarkMode(!darkMode);
      showToast('success', `Switched to ${!darkMode ? 'light' : 'dark'} mode`);
    } else if (cmdId === 'action-export-data') {
      // Export data logic
      showToast('success', 'Data exported successfully');
    }
    
    setCommandPaletteOpen(false);
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
      }
      
      // Arrow keys in command palette
      if (commandPaletteOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCommand(prev => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCommand(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleCommandExecute(filteredCommands[selectedCommand]?.id || '');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, filteredCommands, selectedCommand]);

  // Render active view
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Home />;
      case 'snippets':
        return <SnippetManager />;
      case 'bugs':
        return <BugTracker />;
      case 'sprint':
        return <SprintBoard />;
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
        return <Home />;
    }
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className={`bg-gray-900 dark:bg-gray-800 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'} flex flex-col`}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && <h1 className="text-xl font-bold">DevFlow Pro</h1>}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-700"
            >
              {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul>
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveView(item.id as any)}
                  className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                    activeView === item.id
                      ? 'bg-violet-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <item.icon size={20} className="mr-3" />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => {
              setDarkMode(!darkMode);
              showToast('success', `Switched to ${!darkMode ? 'light' : 'dark'} mode`);
            }}
            className="flex items-center w-full p-2 rounded-lg hover:bg-gray-700"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            {sidebarOpen && <span className="ml-3">Toggle Theme</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white capitalize">
              {navItems.find(item => item.id === activeView)?.label}
            </h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Search size={16} className="mr-2" />
                <span>Cmd+K</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
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
                <Search size={20} className="text-gray-400 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedCommand(0);
                  }}
                  placeholder="Type a command..."
                  className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">No commands found</div>
              ) : (
                <ul>
                  {filteredCommands.map((cmd, index) => (
                    <li key={cmd.id}>
                      <button
                        onClick={() => handleCommandExecute(cmd.id)}
                        className={`w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          index === selectedCommand ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 uppercase mr-2">{cmd.category}</span>
                          <span>{cmd.label}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg shadow-lg max-w-md ${
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : toast.type === 'error'
                ? 'bg-red-500 text-white'
                : toast.type === 'warning'
                ? 'bg-yellow-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
          >
            <div className="flex items-center">
              {toast.type === 'success' && <CheckCircle size={20} className="mr-2" />}
              {toast.type === 'error' && <XCircle size={20} className="mr-2" />}
              {toast.type === 'warning' && <AlertTriangle size={20} className="mr-2" />}
              {toast.type === 'info' && <Info size={20} className="mr-2" />}
              <span>{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}