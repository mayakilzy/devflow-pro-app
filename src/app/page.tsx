"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Home, Code, Bug, Calendar, Smile, Search, Activity, Book, Settings, Plus, Trash2, Edit, X, Check, AlertCircle, Filter, Copy, CalendarDays, TrendingUp, BarChart3, LineChart, Clock, GitCommit, Server, ChevronDown, Star, Bookmark, History, FileText, Tag, User, Clock as ClockIcon, Zap, ChevronRight, Menu, X as Close, ArrowRight } from 'lucide-react';
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
  lastBuildTime: number;
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
  details?: string;
};

type Settings = {
  theme: 'light' | 'dark';
  notifications: boolean;
  autoSave: boolean;
};

type Command = {
  id: string;
  title: string;
  category: 'navigation' | 'actions' | 'recent';
  action: () => void;
  shortcut?: string;
};

// Utility functions
const playSound = (type: 'success' | 'error' | 'alert') => {
  if (typeof window === 'undefined') return;
  
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
};

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading from localStorage:`, error);
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving to localStorage:`, error);
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

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    playSound('success');
  });
};

const sanitizeMarkdown = (markdown: string) => {
  return marked(markdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''));
};

const getSeverityColor = (severity: Bug['severity']) => {
  switch (severity) {
    case 'critical': return 'bg-red-500 text-white';
    case 'major': return 'bg-orange-500 text-white';
    case 'minor': return 'bg-yellow-500 text-black';
    case 'cosmetic': return 'bg-gray-300 text-black';
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

const getMoodColor = (mood: MoodEntry['mood']) => {
  switch (mood) {
    case '😊': return 'bg-green-100 text-green-800';
    case '🙃': return 'bg-blue-100 text-blue-800';
    case '😐': return 'bg-yellow-100 text-yellow-800';
    case '😕': return 'bg-orange-100 text-orange-800';
    case '😢': return 'bg-red-100 text-red-800';
  }
};

const getMoodScore = (mood: MoodEntry['mood']) => {
  switch (mood) {
    case '😊': return 5;
    case '🙃': return 4;
    case '😐': return 3;
    case '😕': return 2;
    case '😢': return 1;
  }
};

const getBuildStatusColor = (status: BuildStatus) => {
  switch (status) {
    case 'success': return 'bg-green-100 text-green-800';
    case 'failed': return 'bg-red-100 text-red-800';
    case 'running': return 'bg-blue-100 text-blue-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
  }
};

const getPriorityColor = (priority: Ticket['priority']) => {
  switch (priority) {
    case 'low': return 'bg-gray-100 text-gray-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-red-100 text-red-800';
  }
};

const getCategoryIcon = (category: KnowledgeArticle['category']) => {
  switch (category) {
    case 'onboarding': return '👋';
    case 'architecture': return '🏗️';
    case 'runbooks': return '📖';
    case 'faqs': return '❓';
    case 'best-practices': return '⭐';
  }
};

// Feature 1: Code Snippet Manager
const SnippetManager = ({ 
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
  languageFilter: 'all' | 'JavaScript' | 'TypeScript' | 'Python';
  setLanguageFilter: (filter: 'all' | 'JavaScript' | 'TypeScript' | 'Python') => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) => {
  const [newSnippet, setNewSnippet] = useState<Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    language: 'JavaScript',
    code: '',
    tags: [],
    description: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const filteredSnippets = useMemo(() => {
    return snippets.filter(snippet => {
      const matchesSearch = !searchQuery || 
        snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snippet.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        snippet.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesLanguage = languageFilter === 'all' || snippet.language === languageFilter;
      
      return matchesSearch && matchesLanguage;
    });
  }, [snippets, searchQuery, languageFilter]);

  const handleAddSnippet = () => {
    if (!newSnippet.title.trim() || !newSnippet.code.trim()) {
      showToast('Title and code are required', 'error');
      return;
    }

    const now = new Date().toISOString();
    const snippet: Snippet = {
      id: generateId(),
      title: newSnippet.title,
      language: newSnippet.language,
      code: newSnippet.code,
      tags: newSnippet.tags,
      description: newSnippet.description,
      createdAt: now,
      updatedAt: now
    };

    setSnippets([...snippets, snippet]);
    setNewSnippet({
      title: '',
      language: 'JavaScript',
      code: '',
      tags: [],
      description: ''
    });
    setIsAdding(false);
    showToast('Snippet saved successfully', 'success');
    playSound('success');
  };

  const handleUpdateSnippet = () => {
    if (!editingId || !newSnippet.title.trim() || !newSnippet.code.trim()) {
      showToast('Title and code are required', 'error');
      return;
    }

    const now = new Date().toISOString();
    const updatedSnippets = snippets.map(snippet =>
      snippet.id === editingId
        ? {
            ...snippet,
            title: newSnippet.title,
            language: newSnippet.language,
            code: newSnippet.code,
            tags: newSnippet.tags,
            description: newSnippet.description,
            updatedAt: now
          }
        : snippet
    );

    setSnippets(updatedSnippets);
    setEditingId(null);
    setNewSnippet({
      title: '',
      language: 'JavaScript',
      code: '',
      tags: [],
      description: ''
    });
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
    setIsAdding(true);
  };

  const handleDeleteSnippet = (id: string) => {
    if (confirm('Are you sure you want to delete this snippet?')) {
      setSnippets(snippets.filter(snippet => snippet.id !== id));
      showToast('Snippet deleted', 'info');
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    }
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
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
        >
          <Plus size={16} />
          New Snippet
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All Languages</option>
            <option value="JavaScript">JavaScript</option>
            <option value="TypeScript">TypeScript</option>
            <option value="Python">Python</option>
          </select>
        </div>
      </div>

      {/* Add/Edit Snippet Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  {editingId ? 'Edit Snippet' : 'Add New Snippet'}
                </h3>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setNewSnippet({
                      title: '',
                      language: 'JavaScript',
                      code: '',
                      tags: [],
                      description: ''
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newSnippet.title}
                    onChange={(e) => setNewSnippet({ ...newSnippet, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Enter snippet title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    value={newSnippet.language}
                    onChange={(e) => setNewSnippet({ ...newSnippet, language: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="JavaScript">JavaScript</option>
                    <option value="TypeScript">TypeScript</option>
                    <option value="Python">Python</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code
                  </label>
                  <textarea
                    value={newSnippet.code}
                    onChange={(e) => setNewSnippet({ ...newSnippet, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                    rows={8}
                    placeholder="Enter your code here"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="Add a tag"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newSnippet.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="flex items-center gap-1 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Markdown supported)
                  </label>
                  <textarea
                    value={newSnippet.description}
                    onChange={(e) => setNewSnippet({ ...newSnippet, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    rows={4}
                    placeholder="Enter description..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setNewSnippet({
                      title: '',
                      language: 'JavaScript',
                      code: '',
                      tags: [],
                      description: ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={editingId ? handleUpdateSnippet : handleAddSnippet}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                >
                  {editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snippets List */}
      {filteredSnippets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Code className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No snippets found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || languageFilter !== 'all' 
              ? 'Try adjusting your search or filter' 
              : 'Save your first snippet to build your library'}
          </p>
          {!searchQuery && languageFilter === 'all' && (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
            >
              <Plus size={16} />
              Create Your First Snippet
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSnippets.map((snippet) => (
            <div key={snippet.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{snippet.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getLanguageClass(snippet.language)}`}>
                    {snippet.language}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {snippet.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mb-3">
                  <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
                    <code>{snippet.code.substring(0, 150)}{snippet.code.length > 150 ? '...' : ''}</code>
                  </pre>
                </div>

                {snippet.description && (
                  <div className="mb-3">
                    <div 
                      className="text-sm text-gray-700"
                      dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(snippet.description.substring(0, 100) + (snippet.description.length > 100 ? '...' : '')) }}
                    />
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                  <span>Created: {formatDate(snippet.createdAt)}</span>
                  <span>Updated: {formatDate(snippet.updatedAt)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(snippet.code)}
                    className="flex-1 flex items-center justify-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded transition"
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                  <button
                    onClick={() => handleEditSnippet(snippet)}
                    className="flex-1 flex items-center justify-center gap-1 text-sm bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-2 rounded transition"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteSnippet(snippet.id)}
                    className="flex-1 flex items-center justify-center gap-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded transition"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
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
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) => {
  const [newBug, setNewBug] = useState<Omit<Bug, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    description: '',
    severity: 'major',
    status: 'open',
    category: 'ui'
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const handleAddBug = () => {
    if (!newBug.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    const now = new Date().toISOString();
    const bug: Bug = {
      id: generateId(),
      title: newBug.title,
      description: newBug.description,
      severity: newBug.severity,
      status: newBug.status,
      category: newBug.category,
      createdAt: now,
      updatedAt: now
    };

    setBugs([...bugs, bug]);
    setNewBug({
      title: '',
      description: '',
      severity: 'major',
      status: 'open',
      category: 'ui'
    });
    setIsAdding(false);
    
    // Play alert sound for critical bugs
    if (bug.severity === 'critical') {
      playSound('alert');
      showToast('Critical bug added!', 'error');
    } else {
      showToast('Bug added successfully', 'success');
    }
  };

  const handleUpdateBug = () => {
    if (!newBug.title.trim() || !editingId) {
      showToast('Title is required', 'error');
      return;
    }

    const now = new Date().toISOString();
    const updatedBugs = bugs.map(bug =>
      bug.id === editingId
        ? {
            ...bug,
            title: newBug.title,
            description: newBug.description,
            severity: newBug.severity,
            status: newBug.status,
            category: newBug.category,
            updatedAt: now
          }
        : bug
    );

    setBugs(updatedBugs);
    setEditingId(null);
    setNewBug({
      title: '',
      description: '',
      severity: 'major',
      status: 'open',
      category: 'ui'
    });
    
    // Play alert sound for critical bugs
    if (newBug.severity === 'critical') {
      playSound('alert');
      showToast('Critical bug updated!', 'error');
    } else {
      showToast('Bug updated successfully', 'success');
    }
  };

  const handleEditBug = (bug: Bug) => {
    setNewBug({
      title: bug.title,
      description: bug.description,
      severity: bug.severity,
      status: bug.status,
      category: bug.category
    });
    setEditingId(bug.id);
    setIsAdding(true);
  };

  const handleDeleteBug = (id: string) => {
    if (confirm('Are you sure you want to delete this bug?')) {
      setBugs(bugs.filter(bug => bug.id !== id));
      showToast('Bug deleted', 'info');
      playSound('alert');
    }
  };

  const handleStatusChange = (id: string, status: Bug['status']) => {
    const updatedBugs = bugs.map(bug =>
      bug.id === id ? { ...bug, status, updatedAt: new Date().toISOString() } : bug
    );
    setBugs(updatedBugs);
    showToast(`Bug marked as ${status}`, 'info');
  };

  // Prepare data for charts
  const severityData = useMemo(() => {
    const counts = {
      critical: bugs.filter(bug => bug.severity === 'critical').length,
      major: bugs.filter(bug => bug.severity === 'major').length,
      minor: bugs.filter(bug => bug.severity === 'minor').length,
      cosmetic: bugs.filter(bug => bug.severity === 'cosmetic').length
    };
    
    return [
      { name: 'Critical', value: counts.critical },
      { name: 'Major', value: counts.major },
      { name: 'Minor', value: counts.minor },
      { name: 'Cosmetic', value: counts.cosmetic }
    ];
  }, [bugs]);

  const trendData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last14Days.map(date => {
      const created = bugs.filter(bug => bug.createdAt.startsWith(date)).length;
      const resolved = bugs.filter(bug => bug.updatedAt.startsWith(date) && bug.status === 'resolved').length;
      
      return {
        date: format(new Date(date), 'MMM dd'),
        created,
        resolved
      };
    });
  }, [bugs]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bug Tracker</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
        >
          <Plus size={16} />
          New Bug
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
            <option value="cosmetic">Cosmetic</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All Categories</option>
            <option value="ui">UI</option>
            <option value="logic">Logic</option>
            <option value="performance">Performance</option>
            <option value="security">Security</option>
          </select>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium mb-4">Severity Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium mb-4">Created vs Resolved (14 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
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

      {/* Add/Edit Bug Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  {editingId ? 'Edit Bug' : 'Add New Bug'}
                </h3>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setNewBug({
                      title: '',
                      description: '',
                      severity: 'major',
                      status: 'open',
                      category: 'ui'
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newBug.title}
                    onChange={(e) => setNewBug({ ...newBug, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Enter bug title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newBug.description}
                    onChange={(e) => setNewBug({ ...newBug, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    rows={4}
                    placeholder="Describe the bug..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Severity
                    </label>
                    <select
                      value={newBug.severity}
                      onChange={(e) => setNewBug({ ...newBug, severity: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="critical">Critical</option>
                      <option value="major">Major</option>
                      <option value="minor">Minor</option>
                      <option value="cosmetic">Cosmetic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={newBug.status}
                      onChange={(e) => setNewBug({ ...newBug, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newBug.category}
                      onChange={(e) => setNewBug({ ...newBug, category: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="ui">UI</option>
                      <option value="logic">Logic</option>
                      <option value="performance">Performance</option>
                      <option value="security">Security</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setNewBug({
                      title: '',
                      description: '',
                      severity: 'major',
                      status: 'open',
                      category: 'ui'
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={editingId ? handleUpdateBug : handleAddBug}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                >
                  {editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bugs List */}
      {filteredBugs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Bug className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bugs tracked</h3>
          <p className="text-gray-500 mb-4">Add one to start tracking issues</p>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
          >
            <Plus size={16} />
            Create Your First Bug
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBugs.map((bug) => (
            <div key={bug.id} className="bg-white border border-gray-200 rounded-lg p-4">
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
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditBug(bug)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteBug(bug.id)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <h3 className="font-semibold text-lg mb-2">{bug.title}</h3>
              
              {bug.description && (
                <p className="text-gray-700 mb-3">{bug.description}</p>
              )}
              
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Created: {formatDateTime(bug.createdAt)}</span>
                <span>Updated: {formatDateTime(bug.updatedAt)}</span>
              </div>
              
              <div className="mt-3 flex gap-2">
                {bug.status !== 'resolved' && (
                  <button
                    onClick={() => handleStatusChange(bug.id, 'resolved')}
                    className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded transition"
                  >
                    Mark as Resolved
                  </button>
                )}
                {bug.status === 'resolved' && (
                  <button
                    onClick={() => handleStatusChange(bug.id, 'open')}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded transition"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function Feature3Name() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [newTicket, setNewTicket] = useState<Partial<Ticket>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [draggedTicket, setDraggedTicket] = useState<Ticket | null>(null);

  const columns = [
    { id: 'backlog', title: 'Backlog' },
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'review', title: 'Review' },
    { id: 'done', title: 'Done' },
  ];

  const handleAddTicket = () => {
    if (!newTicket.title || !newTicket.description) return;
    
    const ticket: Ticket = {
      id: crypto.randomUUID(),
      title: newTicket.title,
      description: newTicket.description,
      assignee: newTicket.assignee || '',
      priority: newTicket.priority || 'medium',
      storyPoints: newTicket.storyPoints || 1,
      labels: newTicket.labels || [],
      column: 'backlog',
      createdAt: new Date().toISOString(),
    };
    
    setTickets([...tickets, ticket]);
    setNewTicket({});
    setIsModalOpen(false);
    showToast('Ticket added successfully', 'success');
  };

  const handleUpdateTicket = () => {
    if (!editingTicket) return;
    
    setTickets(tickets.map(t => t.id === editingTicket.id ? editingTicket : t));
    setEditingTicket(null);
    setIsModalOpen(false);
    showToast('Ticket updated successfully', 'success');
  };

  const handleDeleteTicket = (id: string) => {
    setTickets(tickets.filter(t => t.id !== id));
    showToast('Ticket deleted', 'info');
  };

  const handleDragStart = (ticket: Ticket) => {
    setDraggedTicket(ticket);
  };

  const handleDragEnd = () => {
    setDraggedTicket(null);
  };

  const handleDrop = (columnId: string) => {
    if (!draggedTicket) return;
    
    setTickets(tickets.map(t => 
      t.id === draggedTicket.id ? { ...t, column: columnId } : t
    ));
    setDraggedTicket(null);
  };

  const getTicketsByColumn = (columnId: string) => {
    return tickets.filter(ticket => ticket.column === columnId);
  };

  const calculateVelocity = () => {
    const lastSixSprints = Array.from({ length: 6 }, (_, i) => ({
      sprint: `Sprint ${i + 1}`,
      velocity: Math.floor(Math.random() * 30) + 20,
    }));
    return lastSixSprints;
  };

  const velocityData = calculateVelocity();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Sprint Kanban Board</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Ticket
        </button>
      </div>

      <div className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Sprint Velocity</h2>
        <BarChart width={600} height={300} data={velocityData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="sprint" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="velocity" fill="#8b5cf6" />
        </BarChart>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {columns.map(column => (
          <div 
            key={column.id}
            className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 min-h-[500px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(column.id)}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white">{column.title}</h3>
              <span className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-full px-2 py-1 text-xs">
                {getTicketsByColumn(column.id).length}
              </span>
            </div>
            
            <Droppable droppableId={column.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {getTicketsByColumn(column.id).map((ticket, index) => (
                    <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white dark:bg-gray-600 rounded-lg p-3 mb-3 shadow cursor-move"
                          draggable
                          onDragStart={() => handleDragStart(ticket)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-800 dark:text-white">{ticket.title}</h4>
                            <div className="flex space-x-1">
                              <button 
                                onClick={() => {
                                  setEditingTicket(ticket);
                                  setIsModalOpen(true);
                                }}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteTicket(ticket.id)}
                                className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{ticket.description}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {ticket.labels.map((label, idx) => (
                              <span key={idx} className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded">
                                {label}
                              </span>
                            ))}
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                            <span>Points: {ticket.storyPoints}</span>
                            <span>Priority: {ticket.priority}</span>
                          </div>
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              {editingTicket ? 'Edit Ticket' : 'Add New Ticket'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={editingTicket ? editingTicket.title : newTicket.title || ''}
                  onChange={(e) => editingTicket 
                    ? setEditingTicket({...editingTicket, title: e.target.value})
                    : setNewTicket({...newTicket, title: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={editingTicket ? editingTicket.description : newTicket.description || ''}
                  onChange={(e) => editingTicket 
                    ? setEditingTicket({...editingTicket, description: e.target.value})
                    : setNewTicket({...newTicket, description: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignee</label>
                  <input
                    type="text"
                    value={editingTicket ? editingTicket.assignee : newTicket.assignee || ''}
                    onChange={(e) => editingTicket 
                      ? setEditingTicket({...editingTicket, assignee: e.target.value})
                      : setNewTicket({...newTicket, assignee: e.target.value})
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select
                    value={editingTicket ? editingTicket.priority : newTicket.priority || 'medium'}
                    onChange={(e) => editingTicket 
                      ? setEditingTicket({...editingTicket, priority: e.target.value as 'low' | 'medium' | 'high'})
                      : setNewTicket({...newTicket, priority: e.target.value as 'low' | 'medium' | 'high'})
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Story Points</label>
                  <select
                    value={editingTicket ? editingTicket.storyPoints : newTicket.storyPoints || 1}
                    onChange={(e) => editingTicket 
                      ? setEditingTicket({...editingTicket, storyPoints: parseInt(e.target.value)})
                      : setNewTicket({...newTicket, storyPoints: parseInt(e.target.value)})
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="5">5</option>
                    <option value="8">8</option>
                    <option value="13">13</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Labels (comma separated)</label>
                  <input
                    type="text"
                    value={editingTicket ? editingTicket.labels.join(', ') : newTicket.labels?.join(', ') || ''}
                    onChange={(e) => editingTicket 
                      ? setEditingTicket({...editingTicket, labels: e.target.value.split(',').map(l => l.trim()).filter(Boolean)})
                      : setNewTicket({...newTicket, labels: e.target.value.split(',').map(l => l.trim()).filter(Boolean)})
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={editingTicket ? handleUpdateTicket : handleAddTicket}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md"
              >
                {editingTicket ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tickets.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-2">Create your first ticket</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Start planning your sprint by adding tasks to the board</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg"
          >
            Add Ticket
          </button>
        </div>
      )}
    </div>
  );
};

function Feature4Name() {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodType>('neutral');
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'trend'>('calendar');

  const moodEmojis: Record<MoodType, string> = {
    happy: '😊',
    satisfied: '🙃',
    neutral: '😐',
    unsatisfied: '😕',
    sad: '😢',
  };

  const moodScores: Record<MoodType, number> = {
    happy: 5,
    satisfied: 4,
    neutral: 3,
    unsatisfied: 2,
    sad: 1,
  };

  const moodColors: Record<MoodType, string> = {
    happy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    satisfied: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    neutral: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    unsatisfied: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    sad: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const getTodayMood = () => {
    const today = new Date().toISOString().split('T')[0];
    return moodEntries.find(entry => entry.date === today);
  };

  const handleCheckIn = () => {
    const today = new Date().toISOString().split('T')[0];
    const existingEntry = moodEntries.find(entry => entry.date === today);
    
    if (existingEntry) {
      setMoodEntries(moodEntries.map(entry => 
        entry.date === today 
          ? { ...entry, mood: selectedMood, note } 
          : entry
      ));
    } else {
      const newEntry: MoodEntry = {
        id: crypto.randomUUID(),
        date: today,
        mood: selectedMood,
        note,
        timestamp: new Date().toISOString(),
      };
      setMoodEntries([...moodEntries, newEntry]);
    }
    
    setNote('');
    setSelectedMood('neutral');
    showToast('Mood check-in saved!', 'success');
  };

  const getMoodForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return moodEntries.find(entry => entry.date === dateStr);
  };

  const getStreak = () => {
    const sortedEntries = [...moodEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let streak = 0;
    let currentDate = new Date();
    
    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.date);
      const diffDays = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak) {
        streak++;
        currentDate = entryDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getBestStreak = () => {
    const sortedEntries = [...moodEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let maxStreak = 0;
    let currentStreak = 0;
    let lastDate = null;
    
    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.date);
      
      if (lastDate && 
          Math.floor((lastDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)) === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
      
      lastDate = entryDate;
    }
    
    return maxStreak;
  };

  const getTeamAverageMood = () => {
    // Simulate team data with 3-5 members
    const teamSize = Math.floor(Math.random() * 3) + 3;
    const teamMoods = Array.from({ length: teamSize }, () => {
      const moods = Object.keys(moodEmojis) as MoodType[];
      return moods[Math.floor(Math.random() * moods.length)];
    });
    
    const totalScore = teamMoods.reduce((sum, mood) => sum + moodScores[mood], 0);
    return (totalScore / teamMoods.length).toFixed(1);
  };

  const getLast30DaysMoodData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const entry = moodEntries.find(e => e.date === dateStr);
      
      data.push({
        date: dateStr,
        mood: entry ? moodScores[entry.mood] : null,
        fullDate: date,
      });
    }
    
    return data;
  };

  const moodTrendData = getLast30DaysMoodData();

  const getMoodCounts = () => {
    const counts = {
      happy: 0,
      satisfied: 0,
      neutral: 0,
      unsatisfied: 0,
      sad: 0,
    };
    
    moodEntries.forEach(entry => {
      counts[entry.mood]++;
    });
    
    return counts;
  };

  const moodCounts = getMoodCounts();

  const renderCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDay = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dayMood = getMoodForDate(currentDay);
      const isCurrentMonth = currentDay.getMonth() === month;
      const isToday = currentDay.toDateString() === today.toDateString();
      
      days.push({
        date: new Date(currentDay),
        mood: dayMood,
        isCurrentMonth,
        isToday,
      });
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
        
        {days.map((day, index) => (
          <div 
            key={index}
            className={`min-h-[80px] p-1 border rounded ${
              day.isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900 text-gray-400'
            } ${day.isToday ? 'border-violet-500 border-2' : 'border-gray-200 dark:border-gray-700'}`}
          >
            <div className="text-right text-sm mb-1">{day.date.getDate()}</div>
            {day.mood && (
              <div className={`text-2xl ${moodColors[day.mood]} rounded-full w-8 h-8 flex items-center justify-center mx-auto`}>
                {moodEmojis[day.mood.mood]}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTrendChart = () => {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Mood Trend (30 days)</h3>
        <LineChart width={600} height={300} data={moodTrendData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis domain={[0, 5]} />
          <Tooltip 
            labelFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString();
            }}
            formatter={(value) => [value, 'Mood Score']}
          />
          <Area type="monotone" dataKey="mood" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
          <Line type="monotone" dataKey="mood" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </div>
    );
  };

  const todayMood = getTodayMood();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Team Mood Tracker</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1 rounded-md ${viewMode === 'calendar' ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Calendar
          </button>
          <button 
            onClick={() => setViewMode('trend')}
            className={`px-3 py-1 rounded-md ${viewMode === 'trend' ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Trend
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Today's Mood</h3>
          {todayMood ? (
            <div className="flex items-center space-x-3">
              <div className={`text-4xl ${moodColors[todayMood.mood]} rounded-full w-16 h-16 flex items-center justify-center`}>
                {moodEmojis[todayMood.mood]}
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{moodEmojis[todayMood.mood]}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{todayMood.note}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4">No check-in for today</p>
              <button 
                onClick={() => document.getElementById('mood-checkin-modal')?.classList.remove('hidden')}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg"
              >
                Check In Now
              </button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Team Average</h3>
          <div className="flex items-center space-x-3">
            <div className="text-4xl">👥</div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{getTeamAverageMood()}/5</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Across {Math.floor(Math.random() * 3) + 3} members</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Your Streak</h3>
          <div className="flex items-center space-x-3">
            <div className="text-4xl">🔥</div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{getStreak()} days</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Best: {getBestStreak()} days</div>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? renderCalendar() : renderTrendChart()}

      <div className="mt-8 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Mood Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(moodCounts).map(([mood, count]) => (
            <div key={mood} className="text-center">
              <div className={`text-3xl ${moodColors[mood as MoodType]} rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2`}>
                {moodEmojis[mood as MoodType]}
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{mood}</div>
              <div className="text-lg font-bold text-gray-800 dark:text-white">{count}</div>
            </div>
          ))}
        </div>
      </div>

      <div id="mood-checkin-modal" className="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">How are you feeling today?</h2>
          <div className="flex justify-around mb-6">
            {Object.entries(moodEmojis).map(([mood, emoji]) => (
              <button
                key={mood}
                onClick={() => setSelectedMood(mood as MoodType)}
                className={`text-4xl p-2 rounded-full ${
                  selectedMood === mood ? 'bg-violet-100 dark:bg-violet-900' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="What's on your mind?"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => document.getElementById('mood-checkin-modal')?.classList.add('hidden')}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleCheckIn}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md"
            >
              Check In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function Feature5Name() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocSearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<DocSearchResult | null>(null);
  const [favorites, setFavorites] = useState<DocSearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'scraping' | 'analyzing'>('idle');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Mock data for search results
  const mockResults: DocSearchResult[] = [
    {
      id: '1',
      title: 'React Documentation',
      url: 'https://reactjs.org/docs',
      snippet: 'React is a JavaScript library for building user interfaces. It allows developers to create reusable UI components.',
      lastUpdated: '2023-05-15',
      content: '# React Documentation\n\nReact is a JavaScript library for building user interfaces. It allows developers to create reusable UI components.',
      category: 'frontend',
      tags: ['javascript', 'ui', 'components'],
      sentiment: 'positive',
    },
    {
      id: '2',
      title: 'Node.js Guide',
      url: 'https://nodejs.org/guides',
      snippet: 'Node.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine. It allows you to run JavaScript on the server.',
      lastUpdated: '2023-04-22',
      content: '# Node.js Guide\n\nNode.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine. It allows you to run JavaScript on the server.',
      category: 'backend',
      tags: ['javascript', 'runtime', 'server'],
      sentiment: 'neutral',
    },
    {
      id: '3',
      title: 'Docker Best Practices',
      url: 'https://docs.docker.com/develop',
      snippet: 'Learn about Docker best practices for building and deploying applications with containers.',
      lastUpdated: '2023-06-10',
      content: '# Docker Best Practices\n\nLearn about Docker best practices for building and deploying applications with containers.',
      category: 'devops',
      tags: ['containers', 'deployment', 'orchestration'],
      sentiment: 'positive',
    },
    {
      id: '4',
      title: 'PostgreSQL Tutorial',
      url: 'https://www.postgresql.org/docs/current/tutorial',
      snippet: 'This tutorial introduces you to PostgreSQL and provides examples of how to use it effectively.',
      lastUpdated: '2023-03-30',
      content: '# PostgreSQL Tutorial\n\nThis tutorial introduces you to PostgreSQL and provides examples of how to use it effectively.',
      category: 'database',
      tags: ['sql', 'relational', 'database'],
      sentiment: 'neutral',
    },
  ];

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    // Add to recent searches
    setRecentSearches(prev => {
      const newSearches = [searchQuery, ...prev.filter(s => s !== searchQuery)];
      return newSearches.slice(0, 10);
    });
    
    setSearchStatus('searching');
    
    // Simulate search with delay
    setTimeout(() => {
      setSearchStatus('scraping');
      
      setTimeout(() => {
        setSearchStatus('analyzing');
        
        setTimeout(() => {
          // Filter results based on query and category
          const filteredResults = mockResults.filter(result => {
            const matchesQuery = 
              result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              result.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
              result.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesCategory = selectedCategory === 'all' || result.category === selectedCategory;
            
            return matchesQuery && matchesCategory;
          });
          
          setSearchResults(filteredResults);
          setSearchStatus('idle');
        }, 800);
      }, 1000);
    }, 500);
  };

  const handleResultClick = (result: DocSearchResult) => {
    setSelectedResult(result);
  };

  const toggleFavorite = (result: DocSearchResult) => {
    if (favorites.some(fav => fav.id === result.id)) {
      setFavorites(favorites.filter(fav => fav.id !== result.id));
      showToast('Removed from favorites', 'info');
    } else {
      setFavorites([...favorites, result]);
      showToast('Added to favorites', 'success');
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 dark:text-green-400';
      case 'negative': return 'text-red-600 dark:text-red-400';
      default: return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'frontend', name: 'Frontend' },
    { id: 'backend', name: 'Backend' },
    { id: 'devops', name: 'DevOps' },
    { id: 'database', name: 'Database' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Documentation Finder</h1>
      
      {/* Toolkit Integration Comments */}
      {/* 
        Toolkit Integration: This feature simulates the following AgentCraft-Toolkit tools:
        - duckduckgo_search_tool: Searches the web for documentation
        - crawl4ai_crawler_tool: Scrapes and extracts content from documentation pages
        - buzz_sentiment_analyzer_tool: Analyzes sentiment of community discussions about the library
      */}
      
      <div className="mb-6">
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-md ${activeTab === 'search' ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 rounded-md ${activeTab === 'favorites' ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Favorites
          </button>
        </div>
        
        {activeTab === 'search' && (
          <div>
            <div className="flex space-x-2 mb-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for library or API documentation..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                {searchStatus === 'searching' && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600"></div>
                  </div>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={searchStatus !== 'idle'}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50"
              >
                Search
              </button>
            </div>
            
            <div className="flex space-x-2 mb-4">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1 rounded-md text-sm ${selectedCategory === category.id ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
            
            {searchStatus !== 'idle' && (
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-blue-800 dark:text-blue-200">
                    {searchStatus === 'searching' && '🔍 Searching with duckduckgo_search_tool...'}
                    {searchStatus === 'scraping' && '📄 Scraping with crawl4ai_crawler_tool...'}
                    {searchStatus === 'analyzing' && '🧠 Analyzing with buzz_sentiment_analyzer_tool...'}
                  </span>
                </div>
              </div>
            )}
            
            {searchResults.length === 0 && searchStatus === 'idle' && searchQuery && (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-2">No results found</h3>
                <p className="text-gray-600 dark:text-gray-400">Try a different search query or category</p>
              </div>
            )}
            
            {searchResults.length > 0 && (
              <div className="space-y-4">
                {searchResults.map(result => (
                  <div 
                    key={result.id} 
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-md transition"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{result.title}</h3>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(result);
                        }}
                        className="text-gray-400 hover:text-yellow-500"
                      >
                        {favorites.some(fav => fav.id === result.id) ? (
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <Star className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">{result.snippet}</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Last updated: {result.lastUpdated}</span>
                      <span className={`font-medium ${getSentimentColor(result.sentiment)}`}>
                        {result.sentiment}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'favorites' && (
          <div>
            {favorites.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">⭐</div>
                <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-2">No favorites yet</h3>
                <p className="text-gray-600 dark:text-gray-400">Save documentation to your favorites for quick access</p>
              </div>
            ) : (
              <div className="space-y-4">
                {favorites.map(result => (
                  <div 
                    key={result.id} 
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-md transition"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{result.title}</h3>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(result);
                        }}
                        className="text-yellow-500"
                      >
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">{result.snippet}</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Last updated: {result.lastUpdated}</span>
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded capitalize">
                        {result.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {recentSearches.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Recent Searches</h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchQuery(search);
                  setActiveTab('search');
                }}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{selectedResult.title}</h2>
              <button 
                onClick={() => setSelectedResult(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-grow">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-500 dark:text-gray-400">Last updated: {selectedResult.lastUpdated}</span>
                  <span className={`font-medium ${getSentimentColor(selectedResult.sentiment)}`}>
                    {selectedResult.sentiment}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded capitalize text-sm">
                    {selectedResult.category}
                  </span>
                  {selectedResult.tags.map((tag, index) => (
                    <span key={index} className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div 
                className="prose prose-sm

dark:prose-invert max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: marked.parse(selectedResult.content) }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Feature6Name() {
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
      history: Array.from({ length: 10 }, (_, i) => ({
        id: `build-${i}`,
        status: i % 3 === 0 ? 'success' : i % 3 === 1 ? 'failed' : 'success',
        duration: Math.floor(Math.random() * 180) + 60,
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      })),
    },
    {
      id: '2',
      name: 'Backend',
      status: 'running',
      lastBuildTime: 180,
      commitHash: 'e4f5g6h',
      commitMessage: 'fix: resolve authentication issue',
      buildNumber: 38,
      environment: 'staging',
      history: Array.from({ length: 10 }, (_, i) => ({
        id: `build-${i}`,
        status: i % 2 === 0 ? 'success' : 'failed',
        duration: Math.floor(Math.random() * 240) + 90,
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      })),
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
      history: Array.from({ length: 10 }, (_, i) => ({
        id: `build-${i}`,
        status: i % 4 === 0 ? 'failed' : 'success',
        duration: Math.floor(Math.random() * 300) + 120,
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      })),
    },
  ]);

  const [uptimeData, setUptimeData] = useState(
    Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 6 + i);
      return {
        date: date.toISOString().split('T')[0],
        frontend: 95 + Math.random() * 5,
        backend: 98 + Math.random() * 2,
        mobile: 92 + Math.random() * 8,
      };
    })
  );

  const [buildTimeData, setBuildTimeData] = useState(
    Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 13 + i);
      return {
        date: date.toISOString().split('T')[0],
        frontend: Math.floor(Math.random() * 60) + 120,
        backend: Math.floor(Math.random() * 80) + 150,
        mobile: Math.floor(Math.random() * 100) + 180,
      };
    })
  );

  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [rollbackProject, setRollbackProject] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setProjects(prev => {
        const updated = [...prev];
        const randomIndex = Math.floor(Math.random() * updated.length);
        const project = updated[randomIndex];
        
        const statuses: ('success' | 'failed' | 'running' | 'pending')[] = ['success', 'failed', 'running', 'pending'];
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        if (newStatus !== project.status) {
          if (newStatus === 'failed') {
            playSound('error');
            showToast(`${project.name} build failed!`, 'error');
          } else if (newStatus === 'success') {
            showToast(`${project.name} build succeeded!`, 'success');
          }
        }
        
        updated[randomIndex] = {
          ...project,
          status: newStatus,
          lastBuildTime: newStatus === 'pending' ? 0 : Math.floor(Math.random() * 300) + 60,
          commitHash: Math.random().toString(36).substring(2, 8),
          commitMessage: ['feat', 'fix', 'docs', 'style', 'refactor'][Math.floor(Math.random() * 5)] + ': ' + 
                         ['update UI', 'resolve bug', 'add feature', 'optimize performance', 'update dependencies'][Math.floor(Math.random() * 5)],
          buildNumber: project.buildNumber + 1,
          environment: ['dev', 'staging', 'production'][Math.floor(Math.random() * 3)] as 'dev' | 'staging' | 'production',
          history: [
            {
              id: `build-${project.buildNumber + 1}`,
              status: newStatus,
              duration: newStatus === 'pending' ? 0 : Math.floor(Math.random() * 300) + 60,
              timestamp: new Date().toISOString(),
            },
            ...project.history.slice(0, 9),
          ],
        };
        
        return updated;
      });
      
      // Update uptime data
      setUptimeData(prev => {
        const newData = [...prev.slice(1)];
        const lastDate = new Date(newData[newData.length - 1].date);
        lastDate.setDate(lastDate.getDate() + 1);
        
        newData.push({
          date: lastDate.toISOString().split('T')[0],
          frontend: 95 + Math.random() * 5,
          backend: 98 + Math.random() * 2,
          mobile: 92 + Math.random() * 8,
        });
        
        return newData;
      });
      
      // Update build time data
      setBuildTimeData(prev => {
        const newData = [...prev.slice(1)];
        const lastDate = new Date(newData[newData.length - 1].date);
        lastDate.setDate(lastDate.getDate() + 1);
        
        newData.push({
          date: lastDate.toISOString().split('T')[0],
          frontend: Math.floor(Math.random() * 60) + 120,
          backend: Math.floor(Math.random() * 80) + 150,
          mobile: Math.floor(Math.random() * 100) + 180,
        });
        
        return newData;
      });
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRollback = (projectId: string) => {
    setRollbackProject(projectId);
    setShowRollbackDialog(true);
  };

  const confirmRollback = () => {
    if (rollbackProject) {
      const project = projects.find(p => p.id === rollbackProject);
      if (project) {
        showToast(`Rolling back ${project.name} to previous version...`, 'info');
        // In a real app, this would trigger an actual rollback
      }
      setShowRollbackDialog(false);
      setRollbackProject(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-yellow-500';
      case 'pending': return 'bg-gray-500';
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

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projects.map(project => (
          <div key={project.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{project.name}</h3>
              <div className="flex items-center space-x-2">
                <span className={`inline-block w-3 h-3 rounded-full ${getStatusColor(project.status)}`}></span>
                <span className="text-sm font-medium">{getStatusText(project.status)}</span>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Build Time:</span>
                <span className="font-medium">{formatDuration(project.lastBuildTime)}</span>
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
                <span className="capitalize font-medium">{project.environment}</span>
              </div>
            </div>
            
            <button 
              onClick={() => handleRollback(project.id)}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded transition"
            >
              Rollback
            </button>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Uptime (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={uptimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" domain={[90, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Line type="monotone" dataKey="frontend" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="backend" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="mobile" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Average Build Time (Last 14 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={buildTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Bar dataKey="frontend" fill="#8b5cf6" name="Frontend" />
              <Bar dataKey="backend" fill="#10b981" name="Backend" />
              <Bar dataKey="mobile" fill="#3b82f6" name="Mobile" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Build History</h3>
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
              {projects.flatMap(project => 
                project.history.map(build => (
                  <tr key={build.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {project.name}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        build.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        build.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        build.status === 'running' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {getStatusText(build.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDuration(build.duration)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(build.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {showRollbackDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Rollback</h3>
            <p className="mb-6">Are you sure you want to rollback this project to the previous version?</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowRollbackDialog(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button 
                onClick={confirmRollback}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Feature7Name() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([
    {
      id: '1',
      title: 'Getting Started with Next.js',
      content: `# Getting Started with Next.js

Next.js is a React framework for building full-stack web applications. It provides an intuitive, file-system based router with support for static site generation (SSG), server-side rendering (SSR), and API routes.

## Key Features

- **File-system based routing**: Create files in the \`pages\` directory to automatically create routes.
- **Static Site Generation**: Pre-render pages at build time for optimal performance.
- **Server-Side Rendering**: Render pages on the server for dynamic content.
- **API Routes**: Build backend APIs with the same framework.

## Installation

\`\`\`bash
npx create-next-app@latest my-app
\`\`\`

## Project Structure

\`\`\`
my-app/
├── pages/
│   ├── index.js
│   ├── about.js
│   └── api/
│       └── hello.js
├── public/
├── styles/
└── package.json
\`\`\``,
      category: 'Onboarding',
      tags: ['nextjs', 'react', 'frontend'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [],
      linkedProjects: ['Frontend'],
    },
    {
      id: '2',
      title: 'Database Optimization Best Practices',
      content: `# Database Optimization Best Practices

Optimizing database performance is crucial for scalable applications. Here are some best practices to follow:

## Indexing Strategy

- Create indexes on frequently queried columns
- Avoid over-indexing as it can slow down write operations
- Use composite indexes for multi-column queries

## Query Optimization

- Use \`EXPLAIN\` to analyze query performance
- Avoid SELECT * - only select the columns you need
- Use JOINs instead of multiple queries when possible

## Connection Pooling

- Implement connection pooling to reuse database connections
- Set appropriate pool size based on your application's needs

## Caching

- Implement caching at the application level for frequently accessed data
- Consider using Redis for distributed caching

## Regular Maintenance

- Regularly update database statistics
- Perform index maintenance during off-peak hours
- Monitor and optimize slow queries`,
      category: 'Best Practices',
      tags: ['database', 'performance', 'optimization'],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      versions: [],
      linkedProjects: ['Backend'],
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: '',
    content: '',
    category: 'Onboarding' as KnowledgeCategory,
    tags: '',
    linkedProjects: [] as string[],
  });

  const categories: KnowledgeCategory[] = ['Onboarding', 'Architecture', 'Runbooks', 'FAQs', 'Best Practices'];
  const projectOptions = ['Frontend', 'Backend', 'Mobile'];

  const filteredArticles = articles.filter(article => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleCreateArticle = () => {
    if (!newArticle.title.trim() || !newArticle.content.trim()) {
      showToast('Please fill in title and content', 'warning');
      return;
    }

    const article: KnowledgeArticle = {
      id: crypto.randomUUID(),
      title: newArticle.title,
      content: newArticle.content,
      category: newArticle.category,
      tags: newArticle.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [],
      linkedProjects: newArticle.linkedProjects,
    };

    setArticles([article, ...articles]);
    setNewArticle({
      title: '',
      content: '',
      category: 'Onboarding',
      tags: '',
      linkedProjects: [],
    });
    setShowCreateForm(false);
    showToast('Article created successfully', 'success');
  };

  const handleUpdateArticle = (id: string, content: string) => {
    setArticles(prev => prev.map(article => {
      if (article.id === id) {
        const updatedArticle = {
          ...article,
          content,
          updatedAt: new Date().toISOString(),
          versions: [
            {
              id: crypto.randomUUID(),
              content: article.content,
              timestamp: article.updatedAt,
            },
            ...article.versions.slice(0, 4), // Keep last 5 versions
          ],
        };
        return updatedArticle;
      }
      return article;
    }));
    showToast('Article updated successfully', 'success');
  };

  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  const featuredArticle = articles.length > 0 ? articles[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Knowledge Base</h2>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>New Article</span>
        </button>
      </div>

      {featuredArticle && (
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center space-x-2 mb-2">
            <Star size={16} />
            <span className="font-semibold">Article of the Week</span>
          </div>
          <h3 className="text-xl font-bold mb-2">{featuredArticle.title}</h3>
          <p className="mb-4 opacity-90">
            {featuredArticle.content.substring(0, 200)}...
          </p>
          <button 
            onClick={() => setSelectedArticle(featuredArticle)}
            className="bg-white text-violet-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium"
          >
            Read Article
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-semibold mb-4">Filters</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="All">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Articles</h4>
              <div className="space-y-2">
                {articles.slice(0, 5).map(article => (
                  <div 
                    key={article.id} 
                    className="p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => setSelectedArticle(article)}
                  >
                    <p className="text-sm font-medium truncate">{article.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(article.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-3">
          {selectedArticle ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedArticle.title}</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>Category: {selectedArticle.category}</span>
                    <span>Reading time: {getReadingTime(selectedArticle.content)} min</span>
                    <span>Updated: {new Date(selectedArticle.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 px-2 py-1 rounded text-sm">
                    {selectedArticle.category}
                  </span>
                  {selectedArticle.tags.map(tag => (
                    <span key={tag} className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-sm">
                      {tag}
                    </span>
                  ))}
                  {selectedArticle.linkedProjects.map(project => (
                    <span key={project} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm">
                      {project}
                    </span>
                  ))}
                </div>
                
                <div 
                  className="prose prose-sm dark:prose-invert max-h-[60vh] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: marked.parse(selectedArticle.content) }}
                />
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-semibold mb-2">Article History</h3>
                <div className="space-y-2">
                  {selectedArticle.versions.length > 0 ? (
                    selectedArticle.versions.map(version => (
                      <div key={version.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Version from {new Date(version.timestamp).toLocaleString()}</span>
                          <button className="text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300">
                            Restore
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {version.content.substring(0, 100)}...
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No previous versions</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {filteredArticles.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <div className="text-5xl mb-4">📚</div>
                  <h3 className="text-xl font-semibold mb-2">No articles found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {searchQuery || selectedCategory !== 'All' 
                      ? 'Try adjusting your search or filters' 
                      : 'Create your first knowledge article to get started'}
                  </p>
                  <button 
                    onClick={() => setShowCreateForm(true)}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg"
                  >
                    Create Article
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredArticles.map(article => (
                    <div 
                      key={article.id} 
                      className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer"
                      onClick={() => setSelectedArticle(article)}
                    >
                      <h3 className="font-semibold mb-2">{article.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {article.content.substring(0, 150)}...
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 px-2 py-1 rounded">
                            {article.category}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {getReadingTime(article.content)} min read
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(article.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Create New Article</h3>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newArticle.title}
                  onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Enter article title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  value={newArticle.category}
                  onChange={(e) => setNewArticle({...newArticle, category: e.target.value as KnowledgeCategory})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={newArticle.tags}
                  onChange={(e) => setNewArticle({...newArticle, tags: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="react, nextjs, frontend"
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
                      type="button"
                      onClick={() => {
                        const updatedProjects = newArticle.linkedProjects.includes(project)
                          ? newArticle.linkedProjects.filter(p => p !== project)
                          : [...newArticle.linkedProjects, project];
                        setNewArticle({...newArticle, linkedProjects: updatedProjects});
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        newArticle.linkedProjects.includes(project)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {project}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content (Markdown supported) *
                </label>
                <textarea
                  value={newArticle.content}
                  onChange={(e) => setNewArticle({...newArticle, content: e.target.value})}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Write your article content here..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateArticle}
                className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition"
              >
                Create Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsView() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [exportData, setExportData] = useState('');

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Default to dark theme
      setTheme('dark');
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleExportData = () => {
    const data = {
      snippets,
      bugs,
      tickets,
      moodEntries,
      docSearches,
      projects,
      articles,
      settings: {
        theme,
      },
      exportDate: new Date().toISOString(),
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    setExportData(jsonString);
    setShowExportDialog(true);
  };

  const handleImportData = () => {
    if (!importData.trim()) {
      showToast('Please paste valid JSON data', 'warning');
      return;
    }

    try {
      const data = JSON.parse(importData);
      
      // Validate imported data structure
      if (!data.snippets || !data.bugs || !data.tickets || !data.moodEntries || 
          !data.docSearches || !data.projects || !data.articles) {
        showToast('Invalid data format', 'error');
        return;
      }
      
      // Import data
      setSnippets(data.snippets);
      setBugs(data.bugs);
      setTickets(data.tickets);
      setMoodEntries(data.moodEntries);
      setDocSearches(data.docSearches);
      setProjects(data.projects);
      setArticles(data.articles);
      
      if (data.settings && data.settings.theme) {
        setTheme(data.settings.theme);
      }
      
      setShowImportDialog(false);
      setImportData('');
      showToast('Data imported successfully', 'success');
    } catch (error) {
      showToast('Failed to import data. Please check the format.', 'error');
    }
  };

  const handleResetData = () => {
    setSnippets([]);
    setBugs([]);
    setTickets([]);
    setMoodEntries([]);
    setDocSearches([]);
    setProjects([]);
    setArticles([]);
    setTheme('dark');
    
    setShowResetDialog(false);
    showToast('All data has been reset', 'success');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Appearance</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Theme</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose between light and dark mode
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-lg ${theme === 'light' ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
            >
              Light
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
            >
              Dark
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Data Management</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium">Export Data</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download all your data as a JSON file
              </p>
            </div>
            <button 
              onClick={handleExportData}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg"
            >
              Export
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium">Import Data</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload a JSON file to restore your data
              </p>
            </div>
            <button 
              onClick={() => setShowImportDialog(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg"
            >
              Import
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium">Reset All Data</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Permanently delete all your data
              </p>
            </div>
            <button 
              onClick={() => setShowResetDialog(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Shortcut</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  Cmd/Ctrl + K
                </td>
                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Open command palette
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  Cmd/Ctrl + N
                </td>
                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Create new item
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  Esc
                </td>
                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Close dialog/palette
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Export Data</h3>
              <button 
                onClick={() => setShowExportDialog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Copy the JSON data below to save your settings:
              </p>
              <textarea
                value={exportData}
                readOnly
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
              />
            </div>
            
            <div className="flex justify-end space-x

function Feature5DocumentationFinder() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentationResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<DocumentationResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [favorites, setFavorites] = useState<DocumentationResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<DocumentationResult[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [bookmarkedCategories, setBookmarkedCategories] = useState<string[]>([]);

  // Mock data for search results
  const mockResults: DocumentationResult[] = [
    {
      id: '1',
      title: 'React Documentation',
      url: 'https://react.dev',
      snippet: 'React is a JavaScript library for building user interfaces. It allows developers to create reusable UI components.',
      lastUpdated: '2023-11-15',
      content: '# React Documentation\n\nReact is a JavaScript library for building user interfaces. It allows developers to create reusable UI components.',
      category: 'frontend',
      tags: ['javascript', 'ui', 'components'],
      sentiment: 'positive'
    },
    {
      id: '2',
      title: 'Node.js API Guide',
      url: 'https://nodejs.org/api',
      snippet: 'Node.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine. It allows you to build scalable network applications.',
      lastUpdated: '2023-10-20',
      content: '# Node.js API Guide\n\nNode.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine. It allows you to build scalable network applications.',
      category: 'backend',
      tags: ['javascript', 'runtime', 'api'],
      sentiment: 'neutral'
    },
    {
      id: '3',
      title: 'Docker Best Practices',
      url: 'https://docs.docker.com',
      snippet: 'Docker is a platform for developing, shipping, and running applications in containers. Best practices include optimizing images and using multi-stage builds.',
      lastUpdated: '2023-12-01',
      content: '# Docker Best Practices\n\nDocker is a platform for developing, shipping, and running applications in containers. Best practices include optimizing images and using multi-stage builds.',
      category: 'devops',
      tags: ['containers', 'deployment', 'optimization'],
      sentiment: 'positive'
    }
  ];

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Simulate API calls with delays
    setTimeout(() => {
      // Uses: duckduckgo_search_tool
      console.log('🔍 Searching with duckduckgo_search_tool...');
      
      setTimeout(() => {
        // Uses: crawl4ai_crawler_tool
        console.log('📄 Scraping with crawl4ai_crawler_tool...');
        
        setTimeout(() => {
          // Uses: buzz_sentiment_analyzer_tool
          console.log('🧠 Analyzing with buzz_sentiment_analyzer_tool...');
          
          // Filter results based on query
          const filtered = mockResults.filter(result => 
            result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            result.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
            result.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          );
          
          setSearchResults(filtered);
          setIsSearching(false);
          
          // Add to recent searches
          const newRecent = [...recentSearches, ...filtered].slice(0, 10);
          setRecentSearches(newRecent);
          saveToStorage('recentSearches', newRecent);
        }, 800);
      }, 1000);
    }, 500);
  };

  const handleBookmark = (result: DocumentationResult) => {
    if (!favorites.some(fav => fav.id === result.id)) {
      const newFavorites = [...favorites, result];
      setFavorites(newFavorites);
      saveToStorage('docFavorites', newFavorites);
      
      // Add category if not already bookmarked
      if (!bookmarkedCategories.includes(result.category)) {
        const newCategories = [...bookmarkedCategories, result.category];
        setBookmarkedCategories(newCategories);
        saveToStorage('docCategories', newCategories);
      }
    }
  };

  const handleRemoveBookmark = (id: string) => {
    const newFavorites = favorites.filter(fav => fav.id !== id);
    setFavorites(newFavorites);
    saveToStorage('docFavorites', newFavorites);
  };

  const filteredFavorites = selectedCategory === 'all' 
    ? favorites 
    : favorites.filter(fav => fav.category === selectedCategory);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Documentation Finder</h1>
      
      <div className="mb-6">
        <div className="flex space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for library or API documentation..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'search' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-500 dark:text-gray-400'}`}
            onClick={() => setActiveTab('search')}
          >
            Search Results
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'favorites' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-500 dark:text-gray-400'}`}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites
          </button>
        </div>
      </div>
      
      {activeTab === 'favorites' && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-gray-700 dark:text-gray-300">Filter by category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Categories</option>
              {bookmarkedCategories.map(category => (
                <option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {isSearching ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Searching documentation...</p>
        </div>
      ) : activeTab === 'search' && searchResults.length === 0 && searchQuery ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No results found for "{searchQuery}"</p>
        </div>
      ) : activeTab === 'favorites' && filteredFavorites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No bookmarked documentation yet</p>
          <p className="text-gray-500 dark:text-gray-500 mt-2">Search and bookmark your favorite docs</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'search' ? searchResults : filteredFavorites).map(result => (
            <div key={result.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{result.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{result.snippet}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>Updated: {formatDate(result.lastUpdated)}</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{result.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {result.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedResult(result);
                      // Add to recent searches if not already there
                      if (!recentSearches.some(r => r.id === result.id)) {
                        const newRecent = [result, ...recentSearches].slice(0, 10);
                        setRecentSearches(newRecent);
                        saveToStorage('recentSearches', newRecent);
                      }
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleBookmark(result)}
                    className="p-2 text-gray-500 hover:text-yellow-500 dark:text-gray-400 dark:hover:text-yellow-400"
                  >
                    <Bookmark size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">{selectedResult.title}</h2>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex items-center space-x-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
                <span>URL: <a href={selectedResult.url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">{selectedResult.url}</a></span>
                <span>Updated: {formatDate(selectedResult.lastUpdated)}</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{selectedResult.category}</span>
              </div>
              
              <div className="prose dark:prose-invert max-w-none mb-6">
                <div dangerouslySetInnerHTML={{ __html: marked.parse(selectedResult.content) }} />
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex flex-wrap gap-1">
                  {selectedResult.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => handleRemoveBookmark(selectedResult.id)}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-800"
                >
                  Remove Bookmark
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Feature6CICDMonitor() {
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
        { id: '1', status: 'success', duration: 120, timestamp: '2023-12-01T10:30:00Z' },
        { id: '2', status: 'failed', duration: 90, timestamp: '2023-12-01T09:15:00Z' },
        { id: '3', status: 'success', duration: 110, timestamp: '2023-11-30T14:45:00Z' },
      ]
    },
    {
      id: '2',
      name: 'Backend',
      status: 'running',
      lastBuildTime: 180,
      commitHash: 'e4f5g6h',
      commitMessage: 'fix: resolve authentication issue',
      buildNumber: 38,
      environment: 'staging',
      history: [
        { id: '1', status: 'success', duration: 180, timestamp: '2023-12-01T11:00:00Z' },
        { id: '2', status: 'success', duration: 170, timestamp: '2023-11-30T15:30:00Z' },
        { id: '3', status: 'running', duration: 0, timestamp: '2023-11-30T14:00:00Z' },
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
        { id: '1', status: 'failed', duration: 240, timestamp: '2023-11-30T16:00:00Z' },
        { id: '2', status: 'success', duration: 200, timestamp: '2023-11-29T10:30:00Z' },
        { id: '3', status: 'success', duration: 220, timestamp: '2023-11-28T14:15:00Z' },
      ]
    }
  ]);
  
  const [uptimeData, setUptimeData] = useState<UptimeDataPoint[]>([]);
  const [buildTimeData, setBuildTimeData] = useState<BuildTimeDataPoint[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [rollbackProject, setRollbackProject] = useState<CICDProject | null>(null);

  // Generate mock uptime data
  useEffect(() => {
    const generateUptimeData = () => {
      const data: UptimeDataPoint[] = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        projects.forEach(project => {
          data.push({
            date: date.toISOString().split('T')[0],
            project: project.name,
            uptime: Math.floor(Math.random() * 20) + 80 // 80-100%
          });
        });
      }
      
      setUptimeData(data);
    };
    
    generateUptimeData();
  }, [projects]);

  // Generate mock build time data
  useEffect(() => {
    const generateBuildTimeData = () => {
      const data: BuildTimeDataPoint[] = [];
      const today = new Date();
      
      for (let i = 13; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        projects.forEach(project => {
          data.push({
            date: date.toISOString().split('T')[0],
            project: project.name,
            duration: Math.floor(Math.random() * 120) + 60 // 60-180 seconds
          });
        });
      }
      
      setBuildTimeData(data);
    };
    
    generateBuildTimeData();
  }, [projects]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setProjects(prevProjects => {
        const updatedProjects = [...prevProjects];
        const randomIndex = Math.floor(Math.random() * updatedProjects.length);
        const project = updatedProjects[randomIndex];
        
        // Randomly update status
        const statuses: CICDStatus[] = ['success', 'failed', 'running', 'pending'];
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
        
        // Update project
        updatedProjects[randomIndex] = {
          ...project,
          status: newStatus,
          lastBuildTime: newStatus === 'running' ? 0 : Math.floor(Math.random() * 200) + 60,
          buildNumber: project.buildNumber + 1,
          commitHash: Math.random().toString(36).substring(2, 8),
          commitMessage: `feat: update ${project.name.toLowerCase()} component`,
          environment: ['dev', 'staging', 'production'][Math.floor(Math.random() * 3)],
          history: [
            {
              id: Date.now().toString(),
              status: newStatus,
              duration: newStatus === 'running' ? 0 : Math.floor(Math.random() * 200) + 60,
              timestamp: new Date().toISOString()
            },
            ...project.history.slice(0, 9)
          ]
        };
        
        return updatedProjects;
      });
    }, 15000); // Update every 15 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleRollback = () => {
    if (rollbackProject) {
      showToast(`Rolling back ${rollbackProject.name} to previous version...`, 'info');
      setShowRollbackDialog(false);
      setRollbackProject(null);
    }
  };

  const getStatusColor = (status: CICDStatus) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: CICDStatus) => {
    switch (status) {
      case 'success': return 'Success';
      case 'failed': return 'Failed';
      case 'running': return 'Running';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const getEnvironmentColor = (environment: string) => {
    switch (environment) {
      case 'production': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'staging': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'dev': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">CI/CD Monitor</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {projects.map(project => (
          <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <h2 className="font-semibold text-lg">{project.name}</h2>
              <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(project.status)}`}>
                {getStatusText(project.status)}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Build:</span>
                <span className="font-medium">#{project.buildNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                <span className="font-medium">{project.lastBuildTime > 0 ? `${project.lastBuildTime}s` : 'Running...'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Commit:</span>
                <span className="font-medium">{project.commitHash}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Message:</span>
                <span className="font-medium truncate">{project.commitMessage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Environment:</span>
                <span className={`px-2 py-1 rounded text-xs ${getEnvironmentColor(project.environment)}`}>
                  {project.environment}
                </span>
              </div>
            </div>
            
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => setSelectedProject(project.id)}
                className="flex-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                History
              </button>
              <button
                onClick={() => {
                  setRollbackProject(project);
                  setShowRollbackDialog(true);
                }}
                className="flex-1 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm"
              >
                Rollback
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-4">Uptime (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={uptimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" domain={[70, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Legend />
              {projects.map(project => (
                <Line
                  key={project.name}
                  type="monotone"
                  dataKey="uptime"
                  data={uptimeData.filter(d => d.project === project.name)}
                  name={project.name}
                  stroke={getProjectColor(project.name)}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-4">Average Build Time (Last 14 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={buildTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Legend />
              {projects.map(project => (
                <Bar
                  key={project.name}
                  dataKey="duration"
                  data={buildTimeData.filter(d => d.project === project.name)}
                  name={project.name}
                  fill={getProjectColor(project.name)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {selectedProject && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">
              Build History - {projects.find(p => p.id === selectedProject)?.name}
            </h2>
            <button
              onClick={() => setSelectedProject(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-3">
            {projects.find(p => p.id === selectedProject)?.history.map(build => (
              <div key={build.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="flex items-center space-x-3">
                  <span className={`w-3 h-3 rounded-full ${getStatusColor(build.status)}`}></span>
                  <div>
                    <div className="font-medium">Build #{build.id.substring(0, 6)}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(build.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded text-xs ${build.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : build.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                    {build.status === 'success' ? 'Success' : build.status === 'failed' ? 'Failed' : build.status === 'running' ? 'Running' : 'Pending'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {build.duration > 0 ? `${build.duration}s` : 'In progress...'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {showRollbackDialog && rollbackProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Confirm Rollback</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to rollback <span className="font-semibold">{rollbackProject.name}</span> to the previous version? This will redeploy the previous successful build.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRollbackDialog(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleRollback}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Feature7KnowledgeBase() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([
    {
      id: '1',
      title: 'Getting Started with React',
      content: '# Getting Started with React\n\nReact is a JavaScript library for building user interfaces. It allows developers to create reusable UI components.\n\n## Installation\n\nTo get started with React, you need to have Node.js installed. You can create a new React application using Create React App:\n\n```bash\nnpx create-react-app my-app\ncd my-app\nnpm start\n```\n\n## Components\n\nComponents are the building blocks of React applications. A component is a JavaScript class or function that optionally accepts input and returns React elements describing what should appear on the screen.\n\n```jsx\nfunction Welcome(props) {\n  return <h1>Hello, {props.name}</h1>;\n}\n```',
      category: 'Onboarding',
      tags: ['react', 'javascript', 'frontend'],
      lastUpdated: '2023-11-15',
      versions: [
        { id: '1', content: '# Getting Started with React\n\nReact is a JavaScript library for building user interfaces.', timestamp: '2023-11-10T10:00:00Z' },
        { id: '2', content: '# Getting Started with React\n\nReact is a JavaScript library for building user interfaces.\n\n## Installation\n\nTo get started with React, you need to have Node.js installed. You can create a new React application using Create React App:\n\n```bash\nnpx create-react-app my-app\ncd my-app\nnpm start\n```', timestamp: '2023-11-12T14:30:00Z' },
        { id: '3', content: '# Getting Started with React\n\nReact is a JavaScript library for building user interfaces.\n\n## Installation\n\nTo get started with React, you need to have Node.js installed. You can create a new React application using Create React App:\n\n```bash\nnpx create-react-app my-app\ncd my-app\nnpm start\n```\n\n## Components\n\nComponents are the building blocks of React applications. A component is a JavaScript class or function that optionally accepts input and returns React elements describing what should appear on the screen.\n\n```jsx\nfunction Welcome(props) {\n  return <h1>Hello, {props.name}</h1>;\n}\n```', timestamp: '2023-11-15T09:15:00Z' }
      ],
      linkedProjects: ['Frontend']
    },
    {
      id: '2',
      title: 'API Authentication Best Practices',
      content: '# API Authentication Best Practices\n\nAPI authentication is crucial for securing your backend services. Here are some best practices to follow:\n\n## Use HTTPS\n\nAlways use HTTPS to encrypt data in transit between the client and server.\n\n## Implement Token-Based Authentication\n\nJWT (JSON Web Tokens) is a popular choice for API authentication. Tokens should be:\n\n- Signed with a strong secret key\n- Have an expiration time\n- Contain minimal necessary claims\n\n## Rate Limiting\n\nImplement rate limiting to prevent abuse and brute force attacks.\n\n```python\nfrom flask_limiter import Limiter\nfrom flask_limiter.util import get_remote_address\n\nlimiter = Limiter(\n    app,\n    key_func=get_remote_address,\n    default_limits=[\"200 per day\", \"50 per hour\"]\n)\n```',
      category: 'Best Practices',
      tags: ['api', 'security', 'authentication'],
      lastUpdated: '2023-11-20',
      versions: [
        { id: '1', content: '# API Authentication Best Practices\n\nAPI authentication is crucial for securing your backend services.', timestamp: '2023-11-15T10:00:00Z' },
        { id: '2', content: '# API Authentication Best Practices\n\nAPI authentication is crucial for securing your backend services.\n\n## Use HTTPS\n\nAlways use HTTPS to encrypt data in transit between the client and server.\n\n## Implement Token-Based Authentication\n\nJWT (JSON Web Tokens) is a popular choice for API authentication. Tokens should be:\n\n- Signed with a strong secret key\n- Have an expiration time\n- Contain minimal necessary claims', timestamp: '2023-11-18T14:30:00Z' },
        { id: '3', content: '# API Authentication Best Practices\n\nAPI authentication is crucial for securing your backend services.\n\n## Use HTTPS\n\nAlways use HTTPS to encrypt data in transit between the client and server.\n\n## Implement Token-Based Authentication\n\nJWT (JSON Web Tokens) is a popular choice for API authentication. Tokens should be:\n\n- Signed with a strong secret key\n- Have an expiration time\n- Contain minimal necessary claims\n\n## Rate Limiting\n\nImplement rate limiting to prevent abuse and brute force attacks.\n\n```python\nfrom flask_limiter import Limiter\nfrom flask_limiter.util import get_remote_address\n\nlimiter = Limiter(\n    app,\n    key_func=get_remote_address,\n    default_limits=[\"200 per day\", \"50 per hour\"]\n)\n```', timestamp: '2023-11-20T09:15:00Z' }
      ],
      linkedProjects: ['Backend']
    },
    {
      id: '3',
      title: 'Database Migration Guide',
      content: '# Database Migration Guide\n\nDatabase migrations are essential for evolving your schema while preserving existing data. This guide covers best practices for managing database migrations.\n\n## Migration Tools\n\nPopular migration tools include:\n- Flyway (Java)\n- Liquibase (Java)\n- Alembic (Python)\n- Rails Migrations (Ruby)\n\n## Best Practices\n\n1. **Version Control**: Keep migrations in version control\n2. **Idempotency**: Ensure migrations can be run multiple times safely\n3. **Rollbacks**: Plan for rollback scenarios\n4. **Testing**: Test migrations in a staging environment\n\n## Example Migration\n\n```sql\n-- Add a new column to users table\nALTER TABLE users ADD COLUMN last_login TIMESTAMP;\n\n-- Create index for performance\nCREATE INDEX idx_users_last_login ON users(last_login);\n```',
      category: 'Runbooks',
      tags: ['database', 'migration', 'sql'],
      lastUpdated: '2023-11-25',
      versions: [
        { id: '1', content: '# Database Migration Guide\n\nDatabase migrations are essential for evolving your schema while preserving existing data.', timestamp: '2023-11-20T10:00:00Z' },
        { id: '2', content: '# Database Migration Guide\n\nDatabase migrations are essential for evolving your schema while preserving existing data. This guide covers best practices for managing database migrations.\n\n## Migration Tools\n\nPopular migration tools include:\n- Flyway (Java)\n- Liquibase (Java)\n- Alembic (Python)\n- Rails Migrations (Ruby)', timestamp: '2023-11-22T14:30:00Z' },
        { id: '3', content: '# Database Migration Guide\n\nDatabase migrations are essential for evolving your schema while preserving existing data. This guide covers best practices for managing database migrations.\n\n## Migration Tools\n\nPopular migration tools include:\n- Flyway (Java)\n- Liquibase (Java)\n- Alembic (Python)\n- Rails Migrations (Ruby)\n\n## Best Practices\n\n1. **Version Control**: Keep migrations in version control\n2. **Idempotency**: Ensure migrations can be run multiple times safely\n3. **Rollbacks**: Plan for rollback scenarios\n4. **Testing**: Test migrations in a staging environment\n\n## Example Migration\n\n```sql\n-- Add a new column to users table\nALTER TABLE users ADD COLUMN last_login TIMESTAMP;\n\n-- Create index for performance\nCREATE INDEX idx_users_last_login ON users(last_login);\n```', timestamp: '2023-11-25T09:15:00Z' }
      ],
      linkedProjects: ['Backend', 'Mobile']
    }
  ]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [newArticle, setNewArticle] = useState({
    title: '',
    content: '',
    category: 'Onboarding',
    tags: '',
    linkedProjects: [] as string[]
  });

  // Filter articles based on search and category
  const filteredArticles = articles.filter(article => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get featured article (for "Article of the Week")
  const featuredArticle = articles.length > 0 ? articles[0] : null;

  // Calculate reading time
  const calculateReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled through filteredArticles state
  };

  // Handle create article
  const handleCreateArticle = () => {
    if (!newArticle.title.trim() || !newArticle.content.trim()) return;
    
    const article: KnowledgeArticle = {
      id: Date.now().toString(),
      title: newArticle.title,
      content: newArticle.content,
      category: newArticle.category,
      tags: newArticle.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      lastUpdated: new Date().toISOString(),
      versions: [{
        id: Date.now().toString(),
        content: newArticle.content,
        timestamp: new Date().toISOString()
      }],
      linkedProjects: newArticle.linkedProjects
    };
    
    setArticles([article, ...articles]);
    setNewArticle({
      title: '',
      content: '',
      category: 'Onboarding',
      tags: '',
      linkedProjects: []
    });
    setShowCreateDialog(false);
    showToast('Article created successfully!', 'success');
  };

  // Handle update article
  const handleUpdateArticle = () => {
    if (!editingArticle || !editingArticle.title.trim() || !editingArticle.content.trim()) return;
    
    const updatedArticles = articles.map(article => {
      if (article.id === editingArticle.id) {
        const newVersion = {
          id: Date.now().toString(),
          content: editingArticle.content,
          timestamp: new Date().toISOString()
        };
        
        return {
          ...article,
          title: editingArticle.title,
          content: editingArticle.content,
          category: editingArticle.category,
          tags: editingArticle.tags,
          lastUpdated: new Date().toISOString(),
          versions: [newVersion, ...article.versions],
          linkedProjects: editingArticle.linkedProjects
        };
      }
      return article;
    });
    
    setArticles(updatedArticles);
    setEditingArticle(null);
    showToast('Article updated successfully!', 'success');
  };

  // Handle delete article
  const handleDeleteArticle = (id: string) => {
    setArticles(articles.filter(article => article.id !== id));
    if (selectedArticle?.id === id) setSelectedArticle(null);
    showToast('Article deleted successfully!', 'success');
  };

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(articles.map(article => article.category)))];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Knowledge Base</h1>
      
      {/* Article of the Week */}
      {featuredArticle && (
        <div className="mb-8 p-6 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
          <div className="flex items-center space-x-2 mb-3">
            <Star size={18} className="text-violet-600" />
            <h2 className="text-lg font-semibold text-violet-800 dark:text-violet-200">Article of the Week</h2>
          </div>
          <h3 className="text-xl font-bold mb-2">{featuredArticle.title}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {featuredArticle.content.substring(0, 200)}...
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{featuredArticle.category}</span>
              <span>{calculateReadingTime(featuredArticle.content)} min read</span>
              <span>{formatDate(featuredArticle.lastUpdated)}</span>
            </div>
            <button
              onClick={() => setSelectedArticle(featuredArticle)}
              className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700"
            >
              Read Article
            </button>
          </div>
        </div>
      )}
      
      {/* Search and Filters */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles by title, content, or tags..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700"
          >
            New Article
          </button>
        </form>
      </div>
      
      {/* Articles List */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No articles found</p>
          <p className="text-gray-500 dark:text-gray-500 mt-2">Create your first knowledge article to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map(article => (
            <div key={article.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{article.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                    {article.content.substring(0, 200)}...
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span>{article.category}</span>
                    <span>{calculateReadingTime(article.content)} min read</span>
                    <span>{formatDate(article.lastUpdated)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {article.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 text-xs rounded">
                        {tag}
                      </span>
                    ))}

</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState<'dashboard' | 'snippets' | 'bugs' | 'sprint' | 'mood' | 'docs' | 'cicd' | 'knowledge' | 'settings'>('dashboard');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // State for all features
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [docSearches, setDocSearches] = useState<DocSearch[]>([]);
  const [cicdProjects, setCicdProjects] = useState<CicdProject[]>([]);
  const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeArticle[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  // Load data from localStorage on mount
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedData = loadFromStorage('devflow-pro');
    if (savedData) {
      setSnippets(savedData.snippets || []);
      setBugs(savedData.bugs || []);
      setTickets(savedData.tickets || []);
      setMoodEntries(savedData.moodEntries || []);
      setDocSearches(savedData.docSearches || []);
      setCicdProjects(savedData.cicdProjects || []);
      setKnowledgeArticles(savedData.knowledgeArticles || []);
      setRecentActivity(savedData.recentActivity || []);
      setIsDarkMode(savedData.isDarkMode ?? true);
    }
    setIsLoading(false);
  }, []);

  // Auto-save data to localStorage
  useEffect(() => {
    if (isLoading) return;

    const timeoutId = setTimeout(() => {
      saveToStorage({
        snippets,
        bugs,
        tickets,
        moodEntries,
        docSearches,
        cicdProjects,
        knowledgeArticles,
        recentActivity,
        isDarkMode
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [snippets, bugs, tickets, moodEntries, docSearches, cicdProjects, knowledgeArticles, recentActivity, isDarkMode, isLoading]);

  // Add toast notification
  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type };
    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  // Add activity to recent activity feed
  const addActivity = (action: string, module: string) => {
    const newActivity: Activity = {
      id: Date.now().toString(),
      action,
      module,
      timestamp: new Date().toISOString()
    };
    setRecentActivity(prev => [newActivity, ...prev].slice(0, 20));
  };

  // Command palette commands
  const commands = [
    { category: 'Navigation', title: 'Dashboard', action: () => setActiveView('dashboard') },
    { category: 'Navigation', title: 'Snippets', action: () => setActiveView('snippets') },
    { category: 'Navigation', title: 'Bugs', action: () => setActiveView('bugs') },
    { category: 'Navigation', title: 'Sprint', action: () => setActiveView('sprint') },
    { category: 'Navigation', title: 'Mood', action: () => setActiveView('mood') },
    { category: 'Navigation', title: 'Documentation', action: () => setActiveView('docs') },
    { category: 'Navigation', title: 'CI/CD', action: () => setActiveView('cicd') },
    { category: 'Navigation', title: 'Knowledge Base', action: () => setActiveView('knowledge') },
    { category: 'Navigation', title: 'Settings', action: () => setActiveView('settings') },
    { category: 'Actions', title: 'New Snippet', action: () => { setActiveView('snippets'); addToast('New snippet form opened', 'info'); } },
    { category: 'Actions', title: 'New Bug', action: () => { setActiveView('bugs'); addToast('New bug form opened', 'info'); } },
    { category: 'Actions', title: 'New Ticket', action: () => { setActiveView('sprint'); addToast('New ticket form opened', 'info'); } },
    { category: 'Actions', title: 'Check Mood', action: () => { setActiveView('mood'); addToast('Mood check-in opened', 'info'); } },
    { category: 'Actions', title: 'Search Docs', action: () => { setActiveView('docs'); addToast('Documentation search opened', 'info'); } },
    { category: 'Actions', title: 'New Article', action: () => { setActiveView('knowledge'); addToast('New article form opened', 'info'); } },
    { category: 'Actions', title: 'Toggle Theme', action: () => { setIsDarkMode(prev => !prev); addToast(`Theme changed to ${!isDarkMode ? 'dark' : 'light'} mode`, 'success'); } },
    { category: 'Actions', title: 'Export Data', action: () => { exportData(); addToast('Data exported successfully', 'success'); } },
    ...recentActivity.slice(0, 5).map(activity => ({
      category: 'Recent',
      title: activity.action,
      action: () => {
        if (activity.module === 'snippets') setActiveView('snippets');
        else if (activity.module === 'bugs') setActiveView('bugs');
        else if (activity.module === 'sprint') setActiveView('sprint');
        else if (activity.module === 'mood') setActiveView('mood');
        else if (activity.module === 'docs') setActiveView('docs');
        else if (activity.module === 'cicd') setActiveView('cicd');
        else if (activity.module === 'knowledge') setActiveView('knowledge');
        else setActiveView('dashboard');
      }
    }))
  ];

  // Filter commands based on search query
  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle keyboard shortcuts for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      } else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setSearchQuery('');
        setSelectedCommandIndex(0);
      } else if (isCommandPaletteOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCommandIndex(prev => (prev + 1) % filteredCommands.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredCommands[selectedCommandIndex]) {
            filteredCommands[selectedCommandIndex].action();
            setIsCommandPaletteOpen(false);
            setSearchQuery('');
            setSelectedCommandIndex(0);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, filteredCommands, selectedCommandIndex]);

  // Export data as JSON
  const exportData = () => {
    const data = {
      snippets,
      bugs,
      tickets,
      moodEntries,
      docSearches,
      cicdProjects,
      knowledgeArticles,
      recentActivity,
      isDarkMode,
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `devflow-pro-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import data from JSON
  const importData = (jsonData: any) => {
    if (jsonData.snippets) setSnippets(jsonData.snippets);
    if (jsonData.bugs) setBugs(jsonData.bugs);
    if (jsonData.tickets) setTickets(jsonData.tickets);
    if (jsonData.moodEntries) setMoodEntries(jsonData.moodEntries);
    if (jsonData.docSearches) setDocSearches(jsonData.docSearches);
    if (jsonData.cicdProjects) setCicdProjects(jsonData.cicdProjects);
    if (jsonData.knowledgeArticles) setKnowledgeArticles(jsonData.knowledgeArticles);
    if (jsonData.recentActivity) setRecentActivity(jsonData.recentActivity);
    if (jsonData.isDarkMode !== undefined) setIsDarkMode(jsonData.isDarkMode);
    
    addToast('Data imported successfully', 'success');
  };

  // Reset all data
  const resetData = () => {
    if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      setSnippets([]);
      setBugs([]);
      setTickets([]);
      setMoodEntries([]);
      setDocSearches([]);
      setCicdProjects([]);
      setKnowledgeArticles([]);
      setRecentActivity([]);
      setIsDarkMode(true);
      addToast('All data has been reset', 'info');
    }
  };

  // CI/CD simulation - update project status every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCicdProjects(prev => {
        const updated = prev.map(project => {
          // Randomly update one project's status
          if (Math.random() > 0.8) {
            const statuses: ('success' | 'failed' | 'running' | 'pending')[] = ['success', 'failed', 'running', 'pending'];
            const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            // If status changed to failed, play error sound and show toast
            if (newStatus === 'failed' && project.status !== 'failed') {
              playSound('error');
              addToast(`${project.name} build failed!`, 'error');
            }
            
            // If status changed to success, show success toast
            if (newStatus === 'success' && project.status !== 'success') {
              addToast(`${project.name} build succeeded!`, 'success');
            }
            
            // Add new build to history
            const newBuild = {
              id: Date.now().toString(),
              status: newStatus,
              duration: Math.floor(Math.random() * 300) + 30, // 30-330 seconds
              timestamp: new Date().toISOString(),
              commitHash: Math.random().toString(36).substring(2, 8),
              commitMessage: `Fix ${Math.floor(Math.random() * 100)} issue${Math.floor(Math.random() * 5) > 0 ? 's' : ''}`,
              buildNumber: project.buildHistory.length + 1,
              environment: ['dev', 'staging', 'production'][Math.floor(Math.random() * 3)]
            };
            
            return {
              ...project,
              status: newStatus,
              lastBuildTime: newStatus === 'running' ? null : new Date().toISOString(),
              buildHistory: [newBuild, ...project.buildHistory].slice(0, 10)
            };
          }
          return project;
        });
        
        // Add activity if any project changed
        const changedProject = prev.find((p, i) => p.status !== updated[i].status);
        if (changedProject) {
          addActivity(
            `${changedProject.name} build ${updated.find(p => p.name === changedProject.name)?.status}`,
            'cicd'
          );
        }
        
        return updated;
      });
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  // Apply dark mode class to body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Render active view
  const renderActiveView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading DevFlow Pro...</p>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <DashboardView 
          snippets={snippets} 
          bugs={bugs} 
          tickets={tickets} 
          moodEntries={moodEntries} 
          docSearches={docSearches} 
          cicdProjects={cicdProjects} 
          knowledgeArticles={knowledgeArticles} 
          recentActivity={recentActivity}
        />;
      case 'snippets':
        return <SnippetsView 
          snippets={snippets} 
          setSnippets={setSnippets} 
          addToast={addToast} 
          addActivity={addActivity}
        />;
      case 'bugs':
        return <BugsView 
          bugs={bugs} 
          setBugs={setBugs} 
          addToast={addToast} 
          addActivity={addActivity}
        />;
      case 'sprint':
        return <SprintView 
          tickets={tickets} 
          setTickets={setTickets} 
          addToast={addToast} 
          addActivity={addActivity}
        />;
      case 'mood':
        return <MoodView 
          moodEntries={moodEntries} 
          setMoodEntries={setMoodEntries} 
          addToast={addToast} 
          addActivity={addActivity}
        />;
      case 'docs':
        return <DocsView 
          docSearches={docSearches} 
          setDocSearches={setDocSearches} 
          addToast={addToast} 
          addActivity={addActivity}
        />;
      case 'cicd':
        return <CicdView 
          cicdProjects={cicdProjects} 
          setCicdProjects={setCicdProjects} 
          addToast={addToast} 
          addActivity={addActivity}
        />;
      case 'knowledge':
        return <KnowledgeView 
          knowledgeArticles={knowledgeArticles} 
          setKnowledgeArticles={setKnowledgeArticles} 
          addToast={addToast} 
          addActivity={addActivity}
        />;
      case 'settings':
        return <SettingsView 
          isDarkMode={isDarkMode} 
          setIsDarkMode={setIsDarkMode} 
          exportData={exportData} 
          importData={importData} 
          resetData={resetData} 
          addToast={addToast}
        />;
      default:
        return <DashboardView 
          snippets={snippets} 
          bugs={bugs} 
          tickets={tickets} 
          moodEntries={moodEntries} 
          docSearches={docSearches} 
          cicdProjects={cicdProjects} 
          knowledgeArticles={knowledgeArticles} 
          recentActivity={recentActivity}
        />;
    }
  };

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
      {/* Command Palette */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="Type a command or search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
                autoFocus
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, index) => (
                  <div
                    key={index}
                    className={`p-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 ${
                      index === selectedCommandIndex ? 'bg-violet-100 dark:bg-violet-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => {
                      cmd.action();
                      setIsCommandPaletteOpen(false);
                      setSearchQuery('');
                      setSelectedCommandIndex(0);
                    }}
                  >
                    <div className="font-medium">{cmd.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{cmd.category}</div>
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

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 slide-in ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              toast.type === 'warning' ? 'bg-yellow-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <div className={`bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-16'
      } flex flex-col`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="bg-violet-500 text-white p-2 rounded-lg">
              <Code className="h-6 w-6" />
            </div>
            {sidebarOpen && (
              <h1 className="ml-3 text-xl font-bold">DevFlow Pro</h1>
            )}
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'snippets', icon: FileCode, label: 'Snippets' },
            { id: 'bugs', icon: Bug, label: 'Bugs' },
            { id: 'sprint', icon: Kanban, label: 'Sprint' },
            { id: 'mood', icon: Smile, label: 'Mood' },
            { id: 'docs', icon: BookOpen, label: 'Docs' },
            { id: 'cicd', icon: Activity, label: 'CI/CD' },
            { id: 'knowledge', icon: BookMarked, label: 'Knowledge' },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                activeView === item.id
                  ? 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {sidebarOpen && <span className="ml-3">{item.label}</span>}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span className="ml-3">Collapse</span>
              </>
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {renderActiveView()}
        </div>
      </div>
    </div>
  );
}