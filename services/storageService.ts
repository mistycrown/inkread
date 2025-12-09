
import { ArticleDetail, IndexFile, IndexItem, AppSettings, PromptTemplate } from '../types';

const STORAGE_PREFIX = 'inkread_';
const INDEX_KEY = `${STORAGE_PREFIX}index`;
const SETTINGS_KEY = `${STORAGE_PREFIX}settings`;
const LAST_MODIFIED_KEY = `${STORAGE_PREFIX}last_modified`;

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'default_standard',
    name: 'Standard (Concise)',
    content: 'You are a knowledge assistant. Process the following raw text and user notes. Extract a concise Title, a Summary (max 3 sentences), and up to 5 Tags.'
  },
  {
    id: 'default_eli5',
    name: 'Explain Like I\'m 5',
    content: 'Explain the content simply as if you are talking to a 5 year old. Use simple language. Extract a fun Title, a very simple Summary, and Tags.'
  },
  {
    id: 'default_detailed',
    name: 'Detailed Analysis',
    content: 'Provide a comprehensive summary that captures all key points, arguments, and details. The title should be descriptive. Extract up to 5 specific tags.'
  }
];

// Helper to update global modification timestamp
const updateLastModified = (timestamp: number = Date.now()) => {
  localStorage.setItem(LAST_MODIFIED_KEY, timestamp.toString());
};

export const getLastModified = (): number => {
  const raw = localStorage.getItem(LAST_MODIFIED_KEY);
  return raw ? parseInt(raw, 10) : 0;
};

export const getIndex = (): IndexFile => {
  const raw = localStorage.getItem(INDEX_KEY);
  if (!raw) {
    return { last_sync_time: 0, items: [] };
  }
  return JSON.parse(raw);
};

export const saveIndex = (index: IndexFile): void => {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
};

export const getArticle = (id: string): ArticleDetail | null => {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}article_${id}`);
  return raw ? JSON.parse(raw) : null;
};

export const saveArticle = (article: ArticleDetail): void => {
  localStorage.setItem(`${STORAGE_PREFIX}article_${article.id}`, JSON.stringify(article));

  // Update Index automatically
  const index = getIndex();
  const existingItemIndex = index.items.findIndex(i => i.id === article.id);

  const newItem: IndexItem = {
    id: article.id,
    updated_at: article.updated_at,
    created_at: article.created_at,
    is_deleted: false,
    status: existingItemIndex > -1 ? index.items[existingItemIndex].status : 'inbox',
    preview_text: article.ai_data?.title || article.raw_info.slice(0, 50).replace(/\n/g, ' ') + '...',
    tags: article.ai_data?.tags || [],
    source: article.ai_data?.source,
    link: article.ai_data?.link
  };

  if (existingItemIndex > -1) {
    index.items[existingItemIndex] = newItem;
  } else {
    index.items.push(newItem); // Add new item
  }

  // FORCE SORT: Newest Created First
  index.items.sort((a, b) => b.created_at - a.created_at);

  saveIndex(index);
  updateLastModified(); // Update timestamp on save
};

export const toggleArticleStatus = (id: string, newStatus: 'inbox' | 'archived'): void => {
  const index = getIndex();
  const itemIndex = index.items.findIndex(i => i.id === id);
  if (itemIndex > -1) {
    index.items[itemIndex].status = newStatus;
    index.items[itemIndex].updated_at = Date.now();
    saveIndex(index);
    updateLastModified(); // Update timestamp on status change
  }
};

export const deleteArticle = (id: string): void => {
  const index = getIndex();
  const itemIndex = index.items.findIndex(i => i.id === id);
  if (itemIndex > -1) {
    index.items[itemIndex].is_deleted = true;
    index.items[itemIndex].updated_at = Date.now();
    saveIndex(index);
    updateLastModified(); // Update timestamp on delete
  }
};

/**
 * Performs a deep search across all articles.
 * 1. Checks Index metadata first (fast).
 * 2. If no match in metadata, loads the full article to check content (slow).
 */
export const searchLocalArticles = (query: string): IndexItem[] => {
  const index = getIndex();
  if (!query || !query.trim()) return index.items;

  const rawQuery = query.toLowerCase().trim();

  // Handle #Tag Search
  // If query starts with #, we STRICTLY search only within tags.
  if (rawQuery.startsWith('#')) {
    const tagQuery = rawQuery.slice(1);

    // If user typed just "#", return all non-deleted items (or we could return none, but all seems friendlier)
    if (!tagQuery) return index.items.filter(i => !i.is_deleted);

    return index.items.filter(item => {
      if (item.is_deleted) return false;
      // Strict tag check
      if (!item.tags || item.tags.length === 0) return false;
      return item.tags.some(t => t.toLowerCase().includes(tagQuery));
    });
  }

  // Normal Search (Title, Text, Notes, Tags, Source)
  const lowerQuery = rawQuery;

  return index.items.filter(item => {
    if (item.is_deleted) return false;

    // 1. Fast Metadata Check
    if (item.preview_text.toLowerCase().includes(lowerQuery)) return true;
    if (item.tags.some(t => t.toLowerCase().includes(lowerQuery))) return true;
    // Also check source
    if (item.source && item.source.toLowerCase().includes(lowerQuery)) return true;

    // 2. Deep Content Check
    // We load the article to check raw info and notes
    const article = getArticle(item.id);
    if (!article) return false;

    if (article.raw_info.toLowerCase().includes(lowerQuery)) return true;
    if (article.user_note.toLowerCase().includes(lowerQuery)) return true;
    if (article.ai_data) {
      if (article.ai_data.title.toLowerCase().includes(lowerQuery)) return true;
      if (article.ai_data.summary.toLowerCase().includes(lowerQuery)) return true;
    }

    return false;
  });
};

export const getSettings = (): AppSettings => {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { prompt_templates: DEFAULT_TEMPLATES };
  }

  const settings = JSON.parse(raw);

  // MIGRATION: Single template to List of templates
  if (!settings.prompt_templates || !Array.isArray(settings.prompt_templates)) {
    const templates = [...DEFAULT_TEMPLATES];
    // Check for legacy single prompt field (from previous version code)
    // We cast to any to access deleted/legacy property safely
    const legacyPrompt = (settings as any).ai_prompt_template;

    if (legacyPrompt && typeof legacyPrompt === 'string' && legacyPrompt.trim().length > 0) {
      templates.push({
        id: 'legacy_custom',
        name: 'My Custom Prompt',
        content: legacyPrompt
      });
    }
    settings.prompt_templates = templates;
  }

  return settings;
};

export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  updateLastModified(); // Update timestamp on settings change
};

// Utilities for Sync Service
export const rawWriteFile = (filename: string, content: string) => {
  if (filename === 'index.json') {
    localStorage.setItem(INDEX_KEY, content);
  } else if (filename.endsWith('.json')) {
    const uuid = filename.replace('.json', '');
    localStorage.setItem(`${STORAGE_PREFIX}article_${uuid}`, content);
  }
};

export const rawReadFile = (filename: string): string | null => {
  if (filename === 'index.json') {
    return localStorage.getItem(INDEX_KEY);
  } else if (filename.endsWith('.json')) {
    const uuid = filename.replace('.json', '');
    return localStorage.getItem(`${STORAGE_PREFIX}article_${uuid}`);
  }
  return null;
};

export const getAllArticleFiles = (): string[] => {
  const files: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX + 'article_')) {
      files.push(key.replace(STORAGE_PREFIX + 'article_', '') + '.json');
    }
  }
  return files;
};

// --- Data Import / Export ---

export const createBackup = (): string => {
  // Explicitly fetch latest settings ensuring WebDAV/API keys are included
  const currentSettings = getSettings();
  const index = getIndex();

  // Lazy Init Last Modified if missing
  let lastMod = getLastModified();
  if (lastMod === 0) {
    // Try to find newest article
    if (index.items.length > 0) {
      lastMod = Math.max(...index.items.map(i => i.updated_at || i.created_at));
    } else {
      lastMod = Date.now();
    }
    // SAVE IT so subsequent calls don't generate new Date.now()
    updateLastModified(lastMod);
    console.log("[Backup] Initialized Last Modified to:", lastMod);
  }

  const backup: any = {
    version: 1,
    timestamp: lastMod,
    settings: currentSettings,
    index: index,
    articles: []
  };

  const files = getAllArticleFiles();

  for (const file of files) {
    const content = rawReadFile(file);
    if (content) {
      try {
        backup.articles.push(JSON.parse(content));
      } catch (e) {
        console.warn("Skipping corrupted file during backup:", file);
      }
    }
  }

  return JSON.stringify(backup, null, 2);
};

export const restoreBackup = async (jsonString: string): Promise<string> => {
  try {
    const data = JSON.parse(jsonString);

    // Basic validation
    if (!data.articles || !Array.isArray(data.articles)) {
      throw new Error("Invalid backup format: Missing articles array");
    }

    let importedCount = 0;

    // 1. Restore Articles
    for (const article of data.articles) {
      if (article.id) {
        // Direct write to storage. 
        // We do NOT use saveArticle here to avoid recreating index items prematurely, 
        // as we want to prefer the backup's index which contains statuses.
        localStorage.setItem(`${STORAGE_PREFIX}article_${article.id}`, JSON.stringify(article));
        importedCount++;
      }
    }

    // 2. Restore/Merge Index
    if (data.index && data.index.items) {
      const localIndex = getIndex();
      const backupItems = data.index.items as IndexItem[];

      const mergedItems = [...localIndex.items];

      for (const bItem of backupItems) {
        const idx = mergedItems.findIndex(i => i.id === bItem.id);
        if (idx > -1) {
          // Overwrite existing with backup data (assuming backup is source of truth for Restore operation)
          mergedItems[idx] = bItem;
        } else {
          mergedItems.push(bItem);
        }
      }

      // Sort
      mergedItems.sort((a, b) => b.created_at - a.created_at);

      const newIndex = {
        last_sync_time: Date.now(),
        items: mergedItems
      };
      saveIndex(newIndex);
    } else {
      // Fallback: If no index in backup, reconstruct it from articles
      for (const article of data.articles) {
        saveArticle(article);
      }
    }

    // 3. Restore Settings
    if (data.settings) {
      saveSettings(data.settings);
    }

    // Sync local modification time with backup's time
    if (data.timestamp) {
      updateLastModified(data.timestamp);
    }

    // Notify UI to refresh
    window.dispatchEvent(new Event('inkread_data_updated'));

    return `Successfully imported ${importedCount} scraps. Settings updated.`;
  } catch (e: any) {
    console.error(e);
    throw new Error(`Import failed: ${e.message}`);
  }
};
