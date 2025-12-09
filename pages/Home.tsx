
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
import { getIndex, saveArticle, searchLocalArticles, toggleArticleStatus } from '../services/storageService';
import { syncData } from '../services/webdavService';
import { IndexItem, SyncStatus } from '../types';
import { SketchButton, SketchCard, SketchInput, SketchTextArea } from '../components/SketchComponents';

// Simple UUID Generator for browser env
const generateUUID = () => {
    return crypto.randomUUID();
};

const ITEMS_PER_PAGE = 10;

export const Home: React.FC = () => {
    const navigate = useNavigate();
    // 'allItems' holds the raw index list (for fast inbox/archive switching)
    const [allItems, setAllItems] = useState<IndexItem[]>([]);
    // 'displayItems' is what is actually rendered after filtering/search
    const [displayItems, setDisplayItems] = useState<IndexItem[]>([]);

    const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.IDLE);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentView, setCurrentView] = useState<'inbox' | 'archived'>('inbox');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);

    // Tag Warehouse Filter State
    const [recentTags, setRecentTags] = useState<string[]>([]);

    // Manual Input State
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualContent, setManualContent] = useState('');

    const loadItems = () => {
        const index = getIndex();
        setAllItems(index.items.filter(i => !i.is_deleted));
    };

    useEffect(() => {
        loadItems();

        const handleDataUpdate = () => {
            console.log('[Home] Data updated event received, reloading...');
            loadItems();
        };

        window.addEventListener('inkread_data_updated', handleDataUpdate);

        return () => {
            window.removeEventListener('inkread_data_updated', handleDataUpdate);
        };
    }, []);

    // Compute Recent Tags for Warehouse Mode
    useEffect(() => {
        if (currentView === 'archived') {
            const tagSet = new Set<string>();
            const limit = 15;

            // Items are typically sorted by date in storage (newest first)
            // We iterate and pick unique tags until we hit the limit
            for (const item of allItems) {
                if (item.status === 'archived' && !item.is_deleted && item.tags) {
                    for (const tag of item.tags) {
                        tagSet.add(tag);
                        if (tagSet.size >= limit) break;
                    }
                }
                if (tagSet.size >= limit) break;
            }
            setRecentTags(Array.from(tagSet));
        }
    }, [allItems, currentView]);

    // Effect to handle Filtering and Searching
    useEffect(() => {
        let results: IndexItem[] = [];

        if (searchTerm.trim()) {
            // Deep search if term exists
            results = searchLocalArticles(searchTerm);
        } else {
            // No search, just use all items
            results = allItems;
        }

        // Filter by View (Inbox vs Archived) and Soft Delete
        const finalResults = results.filter(item =>
            !item.is_deleted && item.status === currentView
        );

        // SORT: Ensure Newest Created is First
        finalResults.sort((a, b) => b.created_at - a.created_at);

        setDisplayItems(finalResults);
        setCurrentPage(1); // Reset to page 1 when filters change
    }, [searchTerm, currentView, allItems]);


    const createEntry = (text: string) => {
        if (!text.trim()) return;
        const newId = generateUUID();
        const now = Date.now();

        saveArticle({
            id: newId,
            created_at: now,
            updated_at: now,
            raw_info: text,
            user_note: ''
        });

        loadItems();
        setManualContent('');
        setIsManualMode(false);
        setCurrentView('inbox'); // Switch to inbox to see new item
    };

    const handleCapture = async () => {
        // 1. Attempt to read clipboard
        try {
            if (!navigator.clipboard || !navigator.clipboard.readText) {
                throw new Error("Clipboard API unavailable");
            }

            const text = await navigator.clipboard.readText();

            if (text && text.trim().length > 0) {
                // 2a. Success: Create entry immediately
                createEntry(text);
            } else {
                // 2b. Empty Clipboard: Show Manual Input
                setIsManualMode(true);
            }
        } catch (err) {
            // 3. Error/Denied: Show Manual Input
            console.warn("Clipboard access denied or failed, switching to manual input.", err);
            setIsManualMode(true);
        }
    };

    const handleManualSave = () => {
        createEntry(manualContent);
    };

    const [syncMessage, setSyncMessage] = useState<string>('');

    const handleSync = async () => {
        setSyncStatus(SyncStatus.SYNCING);
        setSyncMessage('');
        try {
            const msg = await syncData();
            console.log(msg);
            setSyncStatus(SyncStatus.SUCCESS);
            setSyncMessage(msg);
            loadItems();
            setTimeout(() => {
                setSyncStatus(SyncStatus.IDLE);
                setSyncMessage('');
            }, 3000);
        } catch (e: any) {
            console.error(e);
            setSyncStatus(SyncStatus.ERROR);
            setSyncMessage(e.message || '同步失败');
            setTimeout(() => {
                setSyncStatus(SyncStatus.IDLE);
                setSyncMessage('');
            }, 5000);
        }
    };

    const toggleTag = (tag: string) => {
        // If we are searching for this tag, clear search
        if (searchTerm === `#${tag}`) {
            setSearchTerm('');
        } else {
            setSearchTerm(`#${tag}`);
        }
    };

    // Pagination Logic
    const totalPages = Math.ceil(displayItems.length / ITEMS_PER_PAGE);
    const paginatedItems = displayItems.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleQuickArchive = (e: React.MouseEvent, item: IndexItem) => {
        e.stopPropagation(); // 阻止卡片点击跳转
        const newStatus = item.status === 'inbox' ? 'archived' : 'inbox';
        toggleArticleStatus(item.id, newStatus);

        // 乐观更新 UI (或者重新加载)
        loadItems();
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-[#F8F5E6] overflow-y-auto">
            <div className="flex flex-col max-w-2xl mx-auto p-4 space-y-6 pb-8 min-h-full">
                {/* Header Action Area */}
                <div className="flex justify-between items-center bg-[#F8F5E6] sticky top-0 py-4 z-10 border-b-2 border-dashed border-zinc-400">
                    <h1 className="text-3xl font-hand font-bold text-zinc-800">InkRead</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSync}
                            className={`p-2 rounded-full border-2 border-zinc-800 hover:bg-yellow-200 transition-colors ${syncStatus === SyncStatus.SYNCING ? 'animate-spin' : ''}`}
                            title="Sync"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
                        </button>
                        <button
                            onClick={() => navigate('/settings')}
                            className="p-2 rounded-full border-2 border-zinc-800 hover:bg-zinc-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                        </button>
                    </div>
                </div>

                {/* Sync Status Message */}
                {syncMessage && (
                    <div className={`mx-4 -mt-2 p-3 rounded-sm border-2 animate-in fade-in slide-in-from-top ${syncStatus === SyncStatus.SUCCESS
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : syncStatus === SyncStatus.ERROR
                            ? 'bg-red-50 border-red-200 text-red-600'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>
                        <div className="flex items-center gap-2">
                            {syncStatus === SyncStatus.SUCCESS && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            )}
                            {syncStatus === SyncStatus.ERROR && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                            )}
                            <span className="font-hand text-sm font-bold">{syncMessage}</span>
                        </div>
                    </div>
                )}

                {/* Input Section */}
                <div className="flex flex-col gap-4">
                    {isManualMode ? (
                        <div className="bg-white p-4 border-2 border-zinc-800 rounded-sm shadow-[4px_4px_0px_0px_rgba(40,40,40,1)] animate-in fade-in zoom-in-95 duration-200">
                            <label className="block font-hand text-lg mb-2">Create a new Scrap</label>
                            <SketchTextArea
                                placeholder="Paste text, URL, or write your thoughts here..."
                                value={manualContent}
                                onChange={(e) => setManualContent(e.target.value)}
                                rows={6}
                                autoFocus
                                className="mb-4"
                            />
                            <div className="flex justify-end gap-3">
                                <SketchButton variant="secondary" onClick={() => setIsManualMode(false)}>
                                    Cancel
                                </SketchButton>
                                <SketchButton onClick={handleManualSave}>
                                    Save Scrap
                                </SketchButton>
                            </div>
                        </div>
                    ) : (
                        <SketchButton onClick={handleCapture} className="flex flex-col justify-center items-center gap-2 py-8 bg-[#FFDE59]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                            <span className="font-bold text-xl">New Scrap</span>
                            <span className="text-xs font-serif font-normal text-zinc-700 opacity-75">(Tries Clipboard first, then Input)</span>
                        </SketchButton>
                    )}

                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <SketchInput
                                placeholder={currentView === 'archived' ? "Search scraps or #tags..." : "Search your messy thoughts..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setCurrentView('inbox'); setSearchTerm(''); }}
                                className={`font-hand px-3 py-1 border-2 rounded-sm transition-all ${currentView === 'inbox' ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-transparent border-transparent text-zinc-500 hover:border-zinc-300'}`}
                            >
                                Inbox
                            </button>
                            <button
                                onClick={() => setCurrentView('archived')}
                                className={`font-hand px-3 py-1 border-2 rounded-sm transition-all ${currentView === 'archived' ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-transparent border-transparent text-zinc-500 hover:border-zinc-300'}`}
                            >
                                Warehouse
                            </button>
                        </div>
                    </div>

                    {/* Warehouse Tag Cloud (Recent Only) */}
                    {currentView === 'archived' && recentTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 animate-fade-in border-t border-dashed border-zinc-300">
                            <span className="text-xs uppercase tracking-widest text-zinc-400 py-1">Recent:</span>
                            {recentTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`text-xs px-2 py-1 rounded-sm border transition-all ${searchTerm === `#${tag}`
                                        ? 'bg-zinc-800 text-[#FFDE59] border-zinc-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
                                        : 'bg-white text-zinc-600 border-zinc-400 hover:border-zinc-800'
                                        }`}
                                >
                                    #{tag}
                                </button>
                            ))}
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="text-xs px-2 py-1 text-red-400 hover:text-red-600">
                                    Clear
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="space-y-4 pb-10">
                    {displayItems.length === 0 ? (
                        <div className="text-center text-zinc-400 font-hand text-xl mt-10 rotate-[-2deg]">
                            {searchTerm ? (
                                <>No scraps found matching "{searchTerm}"</>
                            ) : currentView === 'inbox' ? (
                                <>Nothing in inbox... <br /> Time to find something interesting!</>
                            ) : (
                                <>Warehouse is empty.</>
                            )}
                        </div>
                    ) : (
                        <>
                            {paginatedItems.map(item => (
                                <SketchCard key={item.id} onClick={() => navigate(`/article/${item.id}`)} className="group cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-hand text-xs bg-zinc-200 px-2 py-1 rounded-sm border border-zinc-400">
                                                {new Date(item.updated_at || item.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                                            </span>
                                            {item.source && (
                                                <span className="text-[10px] font-bold bg-zinc-800 text-[#FFDE59] px-2 py-0.5 rounded-sm uppercase tracking-wide transform -rotate-1">
                                                    {item.source}
                                                </span>
                                            )}
                                        </div>
                                        {/* 快速归档/恢复按钮 */}
                                        <button
                                            onClick={(e) => handleQuickArchive(e, item)}
                                            className="p-1.5 rounded-full hover:bg-zinc-200 text-zinc-400 hover:text-zinc-800 transition-colors"
                                            title={item.status === 'inbox' ? "Archive" : "Move to Inbox"}
                                        >
                                            {item.status === 'inbox' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
                                            )}
                                        </button>
                                    </div>
                                    <p className="line-clamp-2 leading-relaxed text-zinc-700 font-medium">
                                        {item.preview_text}
                                    </p>
                                </SketchCard>
                            ))}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-4 pt-6 border-t-2 border-dashed border-zinc-300">
                                    <SketchButton
                                        variant="secondary"
                                        disabled={currentPage === 1}
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        className={`text-sm py-1 px-3 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        &larr; Prev
                                    </SketchButton>

                                    <span className="font-hand font-bold text-lg text-zinc-600">
                                        Page {currentPage} of {totalPages}
                                    </span>

                                    <SketchButton
                                        variant="secondary"
                                        disabled={currentPage === totalPages}
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        className={`text-sm py-1 px-3 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        Next &rarr;
                                    </SketchButton>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
