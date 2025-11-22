import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from './services/geminiService';
import { UploadedImage, Platform, ProcessingResult, TemplateOption } from './types';
import { AVAILABLE_MODELS, PLATFORM_CONFIGS, PLATFORM_TEMPLATES } from './constants';
import { UploadIcon, SparklesIcon, CopyIcon, CheckIcon, RefreshIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from './components/Icons';

const geminiService = new GeminiService();

const App: React.FC = () => {
  // --- State ---

  // Template State: Defaults + Custom from LocalStorage
  const [allTemplates, setAllTemplates] = useState<Record<Platform, TemplateOption[]>>(() => {
    const initialTemplates = { ...PLATFORM_TEMPLATES };
    // Deep copy arrays to avoid mutation of constants
    Object.keys(initialTemplates).forEach(k => {
        const p = k as Platform;
        initialTemplates[p] = [...initialTemplates[p]]; 
    });

    try {
      const saved = localStorage.getItem('travel_agent_custom_templates');
      if (saved) {
        const customTemplates = JSON.parse(saved);
        Object.keys(customTemplates).forEach(k => {
          const p = k as Platform;
          if (initialTemplates[p] && Array.isArray(customTemplates[p])) {
            initialTemplates[p] = [...initialTemplates[p], ...customTemplates[p]];
          }
        });
      }
    } catch (e) {
      console.error("Failed to load custom templates", e);
    }
    return initialTemplates;
  });

  // App State
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [textLog, setTextLog] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<Platform, string>>(() => {
    const defaults: Partial<Record<Platform, string>> = {};
    Object.values(Platform).forEach(p => {
        defaults[p] = PLATFORM_TEMPLATES[p][0].id;
    });
    return defaults as Record<Platform, string>;
  });
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<ProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<Platform>(Platform.RED);
  const [copiedState, setCopiedState] = useState<string | null>(null);

  // Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [templateForm, setTemplateForm] = useState({ id: '', name: '', prompt: '', isCustom: false });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // --- Actions ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      
      const processedImages: UploadedImage[] = await Promise.all(
        newFiles.map(async (file: File) => {
          return new Promise<UploadedImage>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              // Extract base64 data only (remove "data:image/jpeg;base64,")
              const base64 = result.split(',')[1];
              resolve({
                id: Math.random().toString(36).substring(7),
                file,
                previewUrl: result,
                base64: base64,
                mimeType: file.type
              });
            };
            reader.readAsDataURL(file);
          });
        })
      );

      setImages((prev) => [...prev, ...processedImages]);
    }
  };

  const handleGenerate = async () => {
    if (images.length === 0) return alert("Please upload at least one photo.");
    if (!textLog.trim()) return alert("Please enter a travel log or description.");

    setIsProcessing(true);
    setResults(null);

    try {
      // Select platforms to generate for (Currently all)
      const platforms = Object.values(Platform);
      
      const newResults: ProcessingResult = {};
      
      // We can run these in parallel
      const promises = platforms.map(p => {
        const templateId = selectedTemplates[p];
        const template = allTemplates[p].find(t => t.id === templateId);
        // Fallback to first prompt if somehow not found
        const prompt = template ? template.prompt : allTemplates[p][0].prompt;

        return geminiService.generatePlatformContent(p, textLog, images, selectedModel, prompt)
          .then(res => ({ platform: p, data: res }))
          .catch(err => {
            console.error(err);
            return { platform: p, error: true };
          });
      });

      const responses = await Promise.all(promises);
      
      responses.forEach((r: any) => {
        if (!r.error) {
          newResults[r.platform] = r.data;
        }
      });

      setResults(newResults);
    } catch (error) {
      console.error("Global generation error", error);
      alert("Something went wrong during generation. Check console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleImageSelection = (platform: Platform, imageId: string) => {
    if (!results || !results[platform]) return;

    setResults(prev => {
        if (!prev) return null;
        
        const currentPost = prev[platform];
        const currentIds = currentPost.selectedImageIds;
        const isSelected = currentIds.includes(imageId);
        const max = PLATFORM_CONFIGS[platform].maxPhotos;

        let newIds: string[];

        if (isSelected) {
            // Deselect
            newIds = currentIds.filter(id => id !== imageId);
        } else {
            // Select (if limit not reached)
            if (currentIds.length >= max) {
                alert(`Maximum ${max} photos allowed for ${platform}. Deselect one first.`);
                return prev;
            }
            newIds = [...currentIds, imageId];
        }

        return {
            ...prev,
            [platform]: {
                ...currentPost,
                selectedImageIds: newIds
            }
        };
    });
  };

  const handleSort = () => {
    if (!results || !results[activeTab]) return;
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    // Duplicate items
    const currentPost = results[activeTab];
    const items = [...currentPost.selectedImageIds];

    // Remove and save the dragged item content
    const draggedItemContent = items[dragItem.current];
    items.splice(dragItem.current, 1);

    // Switch the position
    items.splice(dragOverItem.current, 0, draggedItemContent);

    // Reset refs
    dragItem.current = null;
    dragOverItem.current = null;

    // Update state
    setResults(prev => {
        if(!prev) return null;
        return {
            ...prev,
            [activeTab]: {
                ...currentPost,
                selectedImageIds: items
            }
        };
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(id);
    setTimeout(() => setCopiedState(null), 2000);
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  // --- Template Management ---

  const openNewTemplateModal = (platform: Platform) => {
    setEditingPlatform(platform);
    setTemplateForm({
        id: `custom-${Date.now()}`,
        name: 'New Template',
        prompt: 'Style: ...\nFormat: ...\nVibe: ...',
        isCustom: true
    });
    setIsTemplateModalOpen(true);
  };

  const openEditTemplateModal = (platform: Platform) => {
      const templateId = selectedTemplates[platform];
      const template = allTemplates[platform].find(t => t.id === templateId);
      if (!template) return;

      setEditingPlatform(platform);
      setTemplateForm({
          id: template.id,
          name: template.name,
          prompt: template.prompt,
          isCustom: !!template.isCustom
      });
      setIsTemplateModalOpen(true);
  };

  const saveTemplate = () => {
      if (!editingPlatform || !templateForm.name.trim() || !templateForm.prompt.trim()) return;

      const isEditingDefault = !templateForm.isCustom;
      const newId = isEditingDefault ? `custom-${Date.now()}` : templateForm.id;

      const newTemplate: TemplateOption = {
          id: newId,
          name: templateForm.name,
          prompt: templateForm.prompt,
          isCustom: true
      };

      setAllTemplates(prev => {
          const platformTemplates = prev[editingPlatform];
          let updatedList: TemplateOption[];

          if (isEditingDefault) {
              // Create new, append to list
              updatedList = [...platformTemplates, newTemplate];
          } else {
              // Update existing
              updatedList = platformTemplates.map(t => t.id === templateForm.id ? newTemplate : t);
              // If somehow ID wasn't found (rare), append
              if (!updatedList.find(t => t.id === newTemplate.id)) {
                  updatedList.push(newTemplate);
              }
          }

          // Persist to localStorage
          const allCustoms: Record<string, TemplateOption[]> = {};
          // Iterate over all platforms to rebuild custom list for storage
          // We need to check all keys in 'prev', but replace current platform list with 'updatedList'
          Object.keys(prev).forEach(k => {
              const p = k as Platform;
              const list = (p === editingPlatform) ? updatedList : prev[p];
              const customsOnly = list.filter(t => t.isCustom);
              if (customsOnly.length > 0) {
                  allCustoms[p] = customsOnly;
              }
          });
          localStorage.setItem('travel_agent_custom_templates', JSON.stringify(allCustoms));

          return {
              ...prev,
              [editingPlatform]: updatedList
          };
      });

      // Select the new/updated template
      setSelectedTemplates(prev => ({
          ...prev,
          [editingPlatform]: newId
      }));

      setIsTemplateModalOpen(false);
  };

  const deleteTemplate = () => {
      if (!editingPlatform || !templateForm.isCustom) return;
      if (!confirm("Are you sure you want to delete this custom template?")) return;

      setAllTemplates(prev => {
          const platformTemplates = prev[editingPlatform];
          const updatedList = platformTemplates.filter(t => t.id !== templateForm.id);

          // Persist
          const allCustoms: Record<string, TemplateOption[]> = {};
          Object.keys(prev).forEach(k => {
              const p = k as Platform;
              const list = (p === editingPlatform) ? updatedList : prev[p];
              const customsOnly = list.filter(t => t.isCustom);
              if (customsOnly.length > 0) {
                  allCustoms[p] = customsOnly;
              }
          });
          localStorage.setItem('travel_agent_custom_templates', JSON.stringify(allCustoms));

          return { ...prev, [editingPlatform]: updatedList };
      });

      // Reset selection to first available (default)
      setSelectedTemplates(prev => ({
          ...prev,
          [editingPlatform]: PLATFORM_TEMPLATES[editingPlatform][0].id
      }));

      setIsTemplateModalOpen(false);
  };


  // --- Render Sections ---

  const renderTemplateModal = () => {
      if (!isTemplateModalOpen) return null;

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800">
                        {templateForm.isCustom ? 'Edit Custom Template' : 'Edit Template (Saves as Copy)'}
                    </h3>
                    <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <XIcon />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">TEMPLATE NAME</label>
                        <input 
                            type="text" 
                            value={templateForm.name}
                            onChange={(e) => setTemplateForm(prev => ({...prev, name: e.target.value}))}
                            className="w-full p-2 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">PROMPT INSTRUCTIONS</label>
                        <textarea 
                            value={templateForm.prompt}
                            onChange={(e) => setTemplateForm(prev => ({...prev, prompt: e.target.value}))}
                            className="w-full h-48 p-2 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                            placeholder="Describe the style, format, vibe, and emoji usage..."
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between">
                    {templateForm.isCustom ? (
                        <button 
                            onClick={deleteTemplate}
                            className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1 px-3 py-2 rounded hover:bg-red-50 transition-colors"
                        >
                            <TrashIcon /> Delete
                        </button>
                    ) : (
                        <div></div> // Spacer
                    )}
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsTemplateModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={saveTemplate}
                            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-colors"
                        >
                            Save Template
                        </button>
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const renderInputSection = () => (
    <div className="space-y-6">
      {/* Image Upload */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="bg-blue-100 text-blue-600 p-1 rounded">1</span> Upload Photos
        </h2>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
              <img src={img.previewUrl} alt="preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => removeImage(img.id)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors text-slate-400 hover:text-blue-500 hover:border-blue-400"
          >
            <UploadIcon />
            <span className="text-xs mt-2">Add Photo</span>
          </div>
        </div>
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileUpload}
        />
        <p className="text-xs text-slate-500 text-right">{images.length} photos selected</p>
      </div>

      {/* Text Input */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="bg-purple-100 text-purple-600 p-1 rounded">2</span> Travel Log
        </h2>
        <textarea
          value={textLog}
          onChange={(e) => setTextLog(e.target.value)}
          placeholder="Describe your trip... e.g., 'Visited the Eiffel Tower today, output was sunny but crowded. The crepes were amazing. Felt really romantic.'"
          className="w-full h-32 p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm leading-relaxed"
        />
      </div>

      {/* Settings */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="bg-orange-100 text-orange-600 p-1 rounded">3</span> Configuration
        </h2>
        
        <div className="flex flex-col gap-2 mb-6">
            <label className="text-sm font-medium text-slate-700">AI Model</label>
            <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2 rounded border border-slate-300 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500"
            >
                {AVAILABLE_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                ))}
            </select>
        </div>

        <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Writing Style Templates</label>
            <div className="space-y-3">
                {Object.values(Platform).map((platform) => (
                    <div key={platform} className="flex flex-col gap-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{PLATFORM_CONFIGS[platform].icon}</span>
                            <span className="text-xs font-semibold text-slate-600">{platform.split(' ')[0]}</span>
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={selectedTemplates[platform]}
                                onChange={(e) => setSelectedTemplates(prev => ({...prev, [platform]: e.target.value}))}
                                className="flex-1 p-1.5 text-xs rounded border border-slate-300 focus:border-blue-500 focus:outline-none bg-white"
                            >
                                {allTemplates[platform].map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} {t.isCustom ? '(Custom)' : ''}
                                    </option>
                                ))}
                            </select>
                            <button 
                                onClick={() => openEditTemplateModal(platform)}
                                className="bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 p-1.5 rounded shadow-sm transition-all"
                                title="Edit selected template"
                            >
                                <PencilIcon />
                            </button>
                            <button 
                                onClick={() => openNewTemplateModal(platform)}
                                className="bg-white border border-slate-200 text-slate-500 hover:text-green-600 hover:border-green-300 p-1.5 rounded shadow-sm transition-all"
                                title="Create new template"
                            >
                                <PlusIcon />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={handleGenerate}
        disabled={isProcessing}
        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2
          ${isProcessing 
            ? 'bg-slate-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-blue-500/30'
          }`}
      >
        {isProcessing ? (
            <>
                <RefreshIcon className="animate-spin h-5 w-5" />
                Generating Content...
            </>
        ) : (
            <>
                <SparklesIcon />
                Generate Workflow
            </>
        )}
      </button>
    </div>
  );

  const renderResultsSection = () => {
    if (!results) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 min-h-[400px]">
                <div className="bg-slate-100 p-4 rounded-full mb-4">
                    <SparklesIcon />
                </div>
                <p>Upload photos and write a log to see magic happen.</p>
            </div>
        );
    }

    const currentResult = results[activeTab];

    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto hide-scrollbar">
          {Object.values(Platform).map((p) => (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              className={`flex-shrink-0 px-6 py-4 text-sm font-medium transition-colors flex items-center gap-2
                ${activeTab === p 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
              <span>{PLATFORM_CONFIGS[p].icon}</span>
              {p}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto">
            {currentResult ? (
                <div className="space-y-6">
                     {/* Result Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold text-slate-800 mb-1">{activeTab} Draft</h3>
                                {/* Show Selected Template */}
                                <span className="text-[10px] uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                                    {allTemplates[activeTab].find(t => t.id === selectedTemplates[activeTab])?.name || 'Custom'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                {currentResult.selectedImageIds.length}/{PLATFORM_CONFIGS[activeTab].maxPhotos} photos selected.
                            </p>
                        </div>
                        <button 
                            onClick={() => copyToClipboard(`${currentResult.content}\n\n${currentResult.hashtags.join(' ')}`, 'main-copy')}
                            className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md transition-colors"
                        >
                            {copiedState === 'main-copy' ? <CheckIcon /> : <CopyIcon />}
                            {copiedState === 'main-copy' ? 'Copied!' : 'Copy Text'}
                        </button>
                    </div>

                    {/* --- NEW: Reorderable Selected Sequence --- */}
                    {currentResult.selectedImageIds.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide text-xs mb-2 flex items-center gap-2">
                                Post Sequence <span className="text-slate-400 font-normal lowercase">(Drag to reorder)</span>
                            </h4>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                {currentResult.selectedImageIds.map((id, index) => {
                                    const img = images.find(i => i.id === id);
                                    if (!img) return null;
                                    return (
                                        <div
                                            key={`${id}-sequence`}
                                            draggable
                                            onDragStart={() => dragItem.current = index}
                                            onDragEnter={() => dragOverItem.current = index}
                                            onDragEnd={handleSort}
                                            onDragOver={(e) => e.preventDefault()}
                                            className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden cursor-move border-2 border-transparent hover:border-blue-400 transition-all group shadow-sm"
                                        >
                                            <img src={img.previewUrl} alt={`sequence-${index}`} className="w-full h-full object-cover" />
                                            <div className="absolute top-0 left-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-br font-mono">
                                                {index + 1}
                                            </div>
                                            {/* Hover to remove quickly */}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); toggleImageSelection(activeTab, id); }}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <XIcon />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Full Selection Grid */}
                    <div>
                         <div className="flex justify-between items-center mb-3">
                             <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide text-xs">
                                 All Photos Selection
                                 <span className="ml-1 text-slate-400 font-normal lowercase">
                                     (Click to add/remove)
                                 </span>
                             </h4>
                         </div>
                         <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {images.map(img => {
                                const isSelected = currentResult.selectedImageIds.includes(img.id);
                                const selectionIndex = currentResult.selectedImageIds.indexOf(img.id);
                                return (
                                    <div 
                                        key={img.id} 
                                        onClick={() => toggleImageSelection(activeTab, img.id)}
                                        className={`
                                            relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200
                                            ${isSelected 
                                                ? 'ring-2 ring-green-500 ring-offset-1 opacity-100 scale-[1.02] shadow-md' 
                                                : 'opacity-50 grayscale hover:grayscale-0 hover:opacity-90'
                                            }
                                        `}
                                    >
                                        <img src={img.previewUrl} alt="selection-candidate" className="w-full h-full object-cover" />
                                        
                                        {/* Selection Indicator Overlay */}
                                        <div className={`absolute top-1 right-1 transition-transform ${isSelected ? 'scale-100' : 'scale-0'}`}>
                                            <div className="bg-green-500 rounded-full w-5 h-5 flex items-center justify-center border border-white text-white text-[10px] font-bold">
                                                {isSelected ? selectionIndex + 1 : ''}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                         </div>
                         {currentResult.reasoning && (
                             <p className="mt-3 text-xs text-slate-500 italic border-l-2 border-blue-200 pl-3 py-1 bg-slate-50 rounded-r">
                                <span className="font-semibold text-blue-600">AI Choice Logic:</span> {currentResult.reasoning}
                             </p>
                         )}
                    </div>

                    {/* Text Content */}
                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                        <h4 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide text-xs">Generated Copy</h4>
                        <div className="whitespace-pre-wrap text-slate-800 text-sm leading-relaxed font-medium">
                            {currentResult.content}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {currentResult.hashtags.map(tag => (
                                <span key={tag} className="text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded">
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                </span>
                            ))}
                        </div>
                    </div>

                </div>
            ) : (
                <div className="h-full flex items-center justify-center text-red-400">
                    Failed to generate content for this platform. Try again.
                </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-2 rounded-lg shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
              Travel Agent Workflow
            </h1>
          </div>
          <div className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
            Powered by Gemini
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs (5 cols) */}
        <div className="lg:col-span-5">
          {renderInputSection()}
        </div>

        {/* Right Column: Output (7 cols) */}
        <div className="lg:col-span-7 min-h-[600px]">
          {renderResultsSection()}
        </div>
      </main>
      
      {/* Modals */}
      {renderTemplateModal()}
    </div>
  );
};

export default App;