import { useState, useEffect } from 'react';
import { Zap, AlertCircle, Loader, ChevronDown } from 'lucide-react';

/**
 * QuizGeneratorModal
 * 
 * Main UI for the hybrid quiz generation system
 * Provides:
 * - Quick topic-based generation
 * - Pre-made deck browsing
 * - CSV upload
 * - Category selection
 */
export default function QuizGeneratorModal({ onDeckGenerated, onClose }) {
  // State management
  const [activeTab, setActiveTab] = useState('generate'); // generate | predefined | csv
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('mixed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [predefinedDecks, setPredefinedDecks] = useState([]);
  const [csvContent, setCsvContent] = useState('');
  const [csvTopic, setCsvTopic] = useState('');
  const [selectedDeck, setSelectedDeck] = useState(null);

  // Load categories and pre-made decks on mount
  useEffect(() => {
    const backendUrl = localStorage.getItem('backendUrl') || 'http://localhost:3000';
    
    Promise.all([
      fetch(`${backendUrl}/api/quiz/categories`)
        .then((res) => res.json())
        .then((data) => setCategories(data.categories || []))
        .catch(() => {}),
      
      fetch(`${backendUrl}/api/quiz/predefined`)
        .then((res) => res.json())
        .then((data) => setPredefinedDecks(data.decks || []))
        .catch(() => {})
    ]);
  }, []);

  // Handle quiz generation
  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const backendUrl = localStorage.getItem('backendUrl') || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/quiz/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          count,
          difficulty,
          source: 'auto'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      onDeckGenerated(data.deck);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV upload
  const handleCSVGenerate = async () => {
    if (!csvContent.trim()) {
      setError('Please enter CSV content');
      return;
    }
    if (!csvTopic.trim()) {
      setError('Please enter a topic name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const backendUrl = localStorage.getItem('backendUrl') || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/quiz/from-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv: csvContent,
          topic: csvTopic.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse CSV');
      }

      onDeckGenerated(data.deck);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle predefined deck loading
  const handleLoadPredefined = async (deckId) => {
    setLoading(true);
    setError('');

    try {
      const backendUrl = localStorage.getItem('backendUrl') || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/quiz/load-predefined`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckId })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load deck');
      }

      onDeckGenerated(data.deck);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle category click
  const handleCategoryClick = (category) => {
    setTopic(category);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-indigo-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">LocalFlux Smart Quiz Builder</h2>
              <p className="text-xs text-blue-100 mt-1">Generate adaptive classroom decks matching your chosen theme.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-indigo-800 rounded p-2 transition"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 px-4 py-3 font-semibold transition ${
              activeTab === 'generate'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Quick Generate
          </button>
          <button
            onClick={() => setActiveTab('predefined')}
            className={`flex-1 px-4 py-3 font-semibold transition ${
              activeTab === 'predefined'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pre-made Decks
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`flex-1 px-4 py-3 font-semibold transition ${
              activeTab === 'csv'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Upload CSV
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Tab: Generate */}
          {activeTab === 'generate' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Learning Theme <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Science, History, Movie Magic"
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <p className="text-xs text-slate-500 mt-1">LocalFlux uses smart template matching for your theme.</p>
              </div>

              {/* Category Suggestions */}
              {categories.length > 0 && !topic.trim() && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    Available Categories:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.slice(0, 8).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategoryClick(cat)}
                        className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition text-left truncate"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Question Count */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Questions: <span className="text-blue-600">{count}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5</span>
                  <span>30</span>
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Difficulty
                </label>
                <div className="relative">
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  >
                    <option value="mixed">Mixed</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Generate Quiz
                  </>
                )}
              </button>

              <p className="text-xs text-gray-400 text-center">
                ⚡ LocalFlux Mode: offline-first generation from built-in knowledge banks.
              </p>
              <p className="text-xs text-gray-400 text-center">Pick a theme, click generate, and load instantly into deck editing.</p>
            </div>
          )}

          {/* Tab: Predefined */}
          {activeTab === 'predefined' && (
            <div className="space-y-4">
              {predefinedDecks.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pre-made decks available</p>
              ) : (
                <div className="grid gap-3">
                  {predefinedDecks.map((deck) => (
                    <div
                      key={deck.id}
                      className="border rounded-lg p-4 hover:bg-blue-50 transition cursor-pointer"
                      onClick={() => handleLoadPredefined(deck.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {deck.title}
                          </h3>
                          {deck.description && (
                            <p className="text-sm text-gray-600">
                              {deck.description}
                            </p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            <span>📝 {deck.totalQuestions} questions</span>
                            <span>⭐ {deck.difficulty}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadPredefined(deck.id);
                          }}
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 transition"
                        >
                          {loading ? 'Loading...' : 'Load'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: CSV */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Topic Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={csvTopic}
                  onChange={(e) => setCsvTopic(e.target.value)}
                  placeholder="e.g., My Custom Quiz"
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  CSV Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder={`topic,question,answer
science,What is H2O?,Water
history,Who was Caesar?,Julius Caesar`}
                  className="w-full border rounded-lg px-4 py-2 h-32 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Format: topic, question, answer (comma-separated)
                </p>
              </div>

              <button
                onClick={handleCSVGenerate}
                disabled={loading || !csvContent.trim() || !csvTopic.trim()}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  'Upload & Generate'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
