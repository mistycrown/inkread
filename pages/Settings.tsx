
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings, createBackup, restoreBackup } from '../services/storageService';
import { testWebDavConnection } from '../services/webdavService';
import { testOpenAIConnection } from '../services/aiService';
import { AppSettings, PromptTemplate } from '../types';
import { SketchButton, SketchInput, SketchTextArea } from '../components/SketchComponents';

// Simple UUID
const uuid = () => crypto.randomUUID();

export const Settings: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<AppSettings>({
        webdav_url: '',
        webdav_user: '',
        webdav_password: '',
        openai_api_key: '',
        openai_base_url: '',
        openai_model: '',
        prompt_templates: []
    });

    const [testResult, setTestResult] = useState<{ msg: string, isError: boolean } | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    const [aiTestResult, setAiTestResult] = useState<{ msg: string, isError: boolean } | null>(null);
    const [isAiTesting, setIsAiTesting] = useState(false);

    // Template Editing State
    const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        setFormData(getSettings());
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        saveSettings(formData);
        alert("Settings saved!");
        navigate('/');
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const msg = await testWebDavConnection(formData);
            if (msg.includes("Successful")) {
                setTestResult({ msg, isError: false });
            } else {
                setTestResult({ msg, isError: true });
            }
        } catch (e: any) {
            setTestResult({ msg: e.message || "Connection Error", isError: true });
        } finally {
            setIsTesting(false);
        }
    };

    const handleTestAiConnection = async () => {
        setIsAiTesting(true);
        setAiTestResult(null);
        try {
            const msg = await testOpenAIConnection(formData);
            setAiTestResult({ msg, isError: false });
        } catch (e: any) {
            setAiTestResult({ msg: e.message || "Connection Error", isError: true });
        } finally {
            setIsAiTesting(false);
        }
    };

    // --- Template Management Logic ---
    const handleAddNewTemplate = () => {
        setEditingTemplate({
            id: uuid(),
            name: 'New Template',
            content: 'You are a helpful assistant...'
        });
        setIsEditMode(true);
    };

    const handleEditTemplate = (template: PromptTemplate) => {
        setEditingTemplate({ ...template }); // Clone
        setIsEditMode(true);
    };

    const handleDeleteTemplate = (id: string) => {
        if (!confirm("Remove this template?")) return;
        const updated = formData.prompt_templates.filter(t => t.id !== id);
        setFormData({ ...formData, prompt_templates: updated });
    };

    const saveTemplateEdit = () => {
        if (!editingTemplate) return;

        const exists = formData.prompt_templates.find(t => t.id === editingTemplate.id);
        let updatedList;

        if (exists) {
            updatedList = formData.prompt_templates.map(t =>
                t.id === editingTemplate.id ? editingTemplate : t
            );
        } else {
            updatedList = [...formData.prompt_templates, editingTemplate];
        }

        setFormData({ ...formData, prompt_templates: updatedList });
        setIsEditMode(false);
        setEditingTemplate(null);
    };

    const cancelTemplateEdit = () => {
        setIsEditMode(false);
        setEditingTemplate(null);
    };

    // --- Import / Export Logic ---
    const handleExport = () => {
        const json = createBackup();
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `inkread_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                const msg = await restoreBackup(content);
                alert(msg);
                // Refresh Settings in state in case they were updated
                setFormData(getSettings());
            } catch (err: any) {
                alert(err.message);
            }
        };
        reader.readAsText(file);
        // Reset input value to allow re-importing same file if needed
        e.target.value = '';
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-[#F8F5E6] overflow-y-auto">
            <div className="max-w-lg mx-auto p-6 pb-20 min-h-full">
                <div className="flex items-center mb-8">
                    <button onClick={() => navigate('/')} className="mr-4 text-zinc-600 hover:text-black transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <h1 className="text-3xl font-hand font-bold">Settings</h1>
                </div>

                <div className="space-y-8">
                    <section>
                        <h2 className="text-xl font-bold border-b-2 border-zinc-800 mb-4 inline-block">WebDAV Sync</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block font-hand text-zinc-600 mb-1">Server URL</label>
                                <SketchInput
                                    name="webdav_url"
                                    value={formData.webdav_url || ''}
                                    onChange={handleChange}
                                    placeholder="https://dav.example.com/inkread"
                                />
                            </div>
                            <div>
                                <label className="block font-hand text-zinc-600 mb-1">Username</label>
                                <SketchInput
                                    name="webdav_user"
                                    value={formData.webdav_user || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block font-hand text-zinc-600 mb-1">Password</label>
                                <SketchInput
                                    type="password"
                                    name="webdav_password"
                                    value={formData.webdav_password || ''}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="flex flex-col gap-3 mt-2">
                                <div className="flex justify-start">
                                    <SketchButton
                                        variant="secondary"
                                        onClick={handleTestConnection}
                                        disabled={isTesting}
                                        className="text-sm py-1"
                                    >
                                        {isTesting ? "Testing..." : "Test Connection"}
                                    </SketchButton>
                                </div>
                                {testResult && (
                                    <div className={`text-sm p-3 rounded-sm border-2 ${testResult.isError ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-700'} animate-in fade-in slide-in-from-top-1`}>
                                        <div className="font-bold mb-1 flex items-center gap-2">
                                            {testResult.isError ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            )}
                                            {testResult.isError ? 'Connection Failed' : 'Success'}
                                        </div>
                                        <p className="break-words leading-relaxed opacity-90">{testResult.msg}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b-2 border-zinc-800 mb-4 inline-block">AI Intelligence</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block font-hand text-zinc-600 mb-1">API Base URL</label>
                                <SketchInput
                                    name="openai_base_url"
                                    value={formData.openai_base_url || ''}
                                    onChange={handleChange}
                                    placeholder="https://api.openai.com/v1"
                                />
                                <p className="text-xs text-zinc-400 mt-1">Leave empty for default OpenAI.</p>
                            </div>
                            <div>
                                <label className="block font-hand text-zinc-600 mb-1">Model Name</label>
                                <SketchInput
                                    name="openai_model"
                                    value={formData.openai_model || ''}
                                    onChange={handleChange}
                                    placeholder="gpt-3.5-turbo"
                                />
                            </div>
                            <div>
                                <label className="block font-hand text-zinc-600 mb-1">API Key</label>
                                <SketchInput
                                    type="password"
                                    name="openai_api_key"
                                    value={formData.openai_api_key || ''}
                                    onChange={handleChange}
                                    placeholder="sk-..."
                                />
                                <p className="text-xs text-zinc-400 mt-1">Key is stored locally in your browser.</p>
                            </div>

                            <div className="flex flex-col gap-3 mt-2">
                                <div className="flex justify-start">
                                    <SketchButton
                                        variant="secondary"
                                        onClick={handleTestAiConnection}
                                        disabled={isAiTesting}
                                        className="text-sm py-1"
                                    >
                                        {isAiTesting ? "Testing..." : "Test AI"}
                                    </SketchButton>
                                </div>
                                {aiTestResult && (
                                    <div className={`text-sm p-3 rounded-sm border-2 ${aiTestResult.isError ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-700'} animate-in fade-in slide-in-from-top-1`}>
                                        <div className="font-bold mb-1 flex items-center gap-2">
                                            {aiTestResult.isError ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            )}
                                            {aiTestResult.isError ? 'Connection Failed' : 'Success'}
                                        </div>
                                        <p className="break-words leading-relaxed opacity-90">{aiTestResult.msg}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b-2 border-zinc-800 mb-4 inline-block">Prompt Templates</h2>

                        {isEditMode && editingTemplate ? (
                            <div className="bg-white p-4 border-2 border-zinc-800 rounded-sm shadow-md animate-in fade-in">
                                <h3 className="font-bold mb-2">Editing Template</h3>
                                <div className="mb-2">
                                    <label className="block text-xs font-bold mb-1">Name</label>
                                    <SketchInput
                                        value={editingTemplate.name}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs font-bold mb-1">Prompt Instruction</label>
                                    <SketchTextArea
                                        rows={4}
                                        value={editingTemplate.content}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                                    />
                                    <p className="text-xs text-zinc-400 mt-1">
                                        The app will automatically append JSON requirements to this prompt.
                                    </p>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <SketchButton variant="secondary" onClick={cancelTemplateEdit}>Cancel</SketchButton>
                                    <SketchButton onClick={saveTemplateEdit}>Save Template</SketchButton>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {formData.prompt_templates.map(template => (
                                    <div key={template.id} className="flex justify-between items-center bg-white p-3 border border-zinc-300 rounded-sm">
                                        <span className="font-hand font-bold text-lg">{template.name}</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditTemplate(template)}
                                                className="text-zinc-500 hover:text-black"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTemplate(template.id)}
                                                className="text-red-300 hover:text-red-500"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <SketchButton onClick={handleAddNewTemplate} variant="secondary" className="w-full text-sm">
                                    + Add New Template
                                </SketchButton>
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b-2 border-zinc-800 mb-4 inline-block">Data Management</h2>
                        <div className="bg-white p-4 border border-zinc-300 rounded-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold">Export Backup</h3>
                                    <p className="text-xs text-zinc-500">Download a JSON file of all your scraps and settings.</p>
                                </div>
                                <div className="relative">
                                    <SketchButton variant="secondary" onClick={handleExport} className="text-sm">
                                        Export JSON
                                    </SketchButton>
                                </div>
                            </div>
                            <div className="border-t border-zinc-200"></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold">Import Backup</h3>
                                    <p className="text-xs text-zinc-500">Restore your scraps from a JSON file.</p>
                                </div>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImport}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        title="Select backup file"
                                    />
                                    <SketchButton variant="secondary" className="text-sm">
                                        Import JSON
                                    </SketchButton>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Improved Action Footer */}
                    <div className="flex gap-4 mt-12 pt-6 border-t-2 border-dashed border-zinc-400">
                        <SketchButton onClick={() => navigate('/')} variant="secondary" className="flex-1">
                            Cancel
                        </SketchButton>
                        <SketchButton onClick={handleSave} className="flex-1 text-lg font-bold bg-[#FFDE59]">
                            Save All Settings
                        </SketchButton>
                    </div>
                </div>
            </div>
        </div>
    );
};
