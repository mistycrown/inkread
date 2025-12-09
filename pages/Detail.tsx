import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getArticle, saveArticle, deleteArticle, getSettings, toggleArticleStatus, getIndex } from '../services/storageService';
import { analyzeText } from '../services/aiService';
import { ArticleDetail, AIStructuredData, IndexItem, AppSettings, PromptTemplate } from '../types';
import { SketchButton, SketchInput, SketchSelect, LoadingSpinner, SketchMarkdown } from '../components/SketchComponents';

const TabButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-3 font-hand text-xl border-b-2 transition-colors ${active ? 'border-zinc-800 font-bold bg-[#FFDE59]/20' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
  >
    {children}
  </button>
);

export const Detail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [status, setStatus] = useState<'inbox' | 'archived'>('inbox');
  const [activeTab, setActiveTab] = useState<'raw' | 'notes' | 'ai'>('raw');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [noteEdit, setNoteEdit] = useState('');
  const [isNotePreview, setIsNotePreview] = useState(false); // Toggle for Note Preview
  const [aiError, setAiError] = useState<string | null>(null);

  // Template State
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  useEffect(() => {
    if (id) {
      const data = getArticle(id);
      if (data) {
        setArticle(data);
        setNoteEdit(data.user_note);
        // Fetch current status from Index
        const index = getIndex();
        const item = index.items.find(i => i.id === id);
        if (item) setStatus(item.status);
      } else {
        navigate('/');
      }
    }

    // Load templates
    const settings = getSettings();
    setTemplates(settings.prompt_templates || []);
    if (settings.prompt_templates && settings.prompt_templates.length > 0) {
      setSelectedTemplateId(settings.prompt_templates[0].id);
    }
  }, [id, navigate]);

  const handleSaveNotes = () => {
    if (!article) return;
    const updated = {
      ...article,
      user_note: noteEdit,
      updated_at: Date.now()
    };
    setArticle(updated);
    saveArticle(updated);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to crumple this up and throw it away?")) {
      if (article) deleteArticle(article.id);
      navigate('/');
    }
  };

  const handleToggleArchive = () => {
    if (!article) return;
    const newStatus = status === 'inbox' ? 'archived' : 'inbox';
    toggleArticleStatus(article.id, newStatus);
    setStatus(newStatus);
  };

  const handleAnalyze = async () => {
    if (!article) return;
    setIsAiLoading(true);
    setAiError(null);
    try {
      const settings = getSettings();
      // Find selected template content
      const template = templates.find(t => t.id === selectedTemplateId);
      const promptContent = template ? template.content : '';

      const aiData = await analyzeText(article.raw_info, noteEdit, settings, promptContent);

      const updated = {
        ...article,
        ai_data: aiData,
        updated_at: Date.now()
      };
      setArticle(updated);
      saveArticle(updated);
    } catch (e: any) {
      setAiError(e.message || "Unknown error occurred");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!article) return null;

  return (
    <div className="fixed inset-0 w-full h-full bg-[#F8F5E6] flex flex-col">
      <div className="flex flex-col max-w-3xl mx-auto w-full h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-zinc-200">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 text-zinc-600 hover:text-black">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div className="flex-1 truncate px-4">
            <h2 className="font-hand font-bold text-xl truncate">{article.ai_data?.title || 'Untitled Scrap'}</h2>
            {status === 'archived' && <span className="text-[10px] uppercase bg-zinc-300 text-zinc-700 px-1 rounded">Archived</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleArchive}
              className={`p-2 hover:bg-zinc-200 rounded-full transition-colors ${status === 'archived' ? 'text-zinc-800' : 'text-zinc-400'}`}
              title={status === 'inbox' ? "Archive" : "Unarchive"}
            >
              {status === 'inbox' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
              )}
            </button>
            <button onClick={handleDelete} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full" title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-zinc-800">
          <TabButton active={activeTab === 'raw'} onClick={() => setActiveTab('raw')}>Raw Info</TabButton>
          <TabButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')}>My Notes</TabButton>
          <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')}>AI Insight</TabButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-20">

          {activeTab === 'raw' && (
            <div className="leading-loose text-zinc-800">
              {/* Use SketchMarkdown instead of raw text rendering */}
              <SketchMarkdown content={article.raw_info} />
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="flex flex-col min-h-full">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setIsNotePreview(!isNotePreview)}
                  className="text-xs uppercase font-bold text-zinc-500 hover:text-black tracking-widest"
                >
                  {isNotePreview ? "Edit Mode" : "Preview Mode"}
                </button>
              </div>

              {isNotePreview ? (
                <div className="bg-white/30 border-l-4 border-zinc-200 pl-4 py-2 min-h-[600px]">
                  {noteEdit ? <SketchMarkdown content={noteEdit} /> : <span className="text-zinc-400 italic">No notes yet...</span>}
                </div>
              ) : (
                <>
                  <textarea
                    className="flex-1 w-full min-h-[600px] bg-transparent resize-none focus:outline-none font-hand text-xl leading-8 text-zinc-700 p-2 border-l-4 border-red-200 pl-4"
                    placeholder="Scribble your thoughts here... (Supports Markdown)"
                    value={noteEdit}
                    onChange={(e) => setNoteEdit(e.target.value)}
                    onBlur={handleSaveNotes}
                  />
                  <p className="text-xs text-zinc-400 mt-2 text-right italic">Auto-saves when you click away</p>
                </>
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              {!article.ai_data ? (
                <div className="text-center py-10">
                  <p className="mb-6 font-hand text-xl text-zinc-500">Structure your chaos with AI.</p>
                  {isAiLoading ? <LoadingSpinner /> : (
                    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
                      {templates.length > 0 && (
                        <div className="w-full">
                          <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block text-left">Select Persona</label>
                          <SketchSelect
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="mb-2"
                          >
                            {templates.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </SketchSelect>
                        </div>
                      )}
                      <SketchButton onClick={handleAnalyze} className="w-full">
                        Analyze This
                      </SketchButton>
                      {aiError && (
                        <div className="text-red-500 font-bold bg-red-100 p-3 rounded border-l-4 border-red-500 text-sm w-full text-left">
                          Error: {aiError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-fade-in">

                  {/* Header Info: Title, Source, Link */}
                  <div className="border-2 border-dashed border-zinc-400 p-4 rounded-sm bg-white/50 relative">
                    {/* Source Badge */}
                    {article.ai_data.source && (
                      <span className="absolute top-0 right-0 -mt-3 mr-4 bg-zinc-800 text-[#FFDE59] px-2 py-0.5 text-xs font-bold uppercase rounded-sm border-2 border-transparent transform rotate-2">
                        {article.ai_data.source}
                      </span>
                    )}

                    <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1">Title</label>
                    <h1 className="text-2xl font-bold font-serif mb-2">{article.ai_data.title}</h1>

                    {/* Original Link Button */}
                    {article.ai_data.link && (
                      <a
                        href={article.ai_data.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                        Open Original Link
                      </a>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="border-2 border-dashed border-zinc-400 p-4 rounded-sm bg-white/50">
                    <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1">Summary</label>
                    <p className="text-lg leading-relaxed">{article.ai_data.summary}</p>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {article.ai_data.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-[#FFDE59] border-2 border-black rounded-full font-hand text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Re-analyze Section */}
                  <div className="mt-8 text-center flex flex-col items-center border-t border-zinc-200 pt-6">
                    {isAiLoading ? <LoadingSpinner /> : (
                      <div className="flex flex-col gap-2 items-center w-full max-w-xs">
                        <p className="text-xs text-zinc-400 mb-2">Want a different perspective?</p>
                        {templates.length > 0 && (
                          <div className="w-full">
                            <SketchSelect
                              value={selectedTemplateId}
                              onChange={(e) => setSelectedTemplateId(e.target.value)}
                              className="text-sm py-1"
                            >
                              {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </SketchSelect>
                          </div>
                        )}
                        <button onClick={handleAnalyze} className="text-sm font-bold text-zinc-600 hover:text-black hover:underline mt-2">
                          Re-analyze
                        </button>
                      </div>
                    )}
                    {aiError && (
                      <div className="text-red-500 font-bold mt-4 bg-red-100 p-2 rounded text-xs">
                        Error: {aiError}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};