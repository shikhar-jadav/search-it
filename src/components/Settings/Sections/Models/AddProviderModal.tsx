'use client';

import { Dialog, DialogPanel } from '@headlessui/react';
import {
  Brain,
  Check,
  Cpu,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfigModelProvider } from '@/lib/config/types';
import { Model } from '@/lib/models/types';
import { toast } from 'sonner';

interface Preset {
  id: string;
  name: string;
  type: string;
  baseURL: string;
  placeholderKey: string;
  requiresKey: boolean;
  hint?: string;
  defaultModels?: { chat: Model[]; embedding: Model[] };
}

const LLM_PRESETS: Preset[] = [
  {
    id: 'groq',
    name: 'Groq',
    type: 'openai',
    baseURL: 'https://api.groq.com/openai/v1',
    placeholderKey: 'gsk_...',
    requiresKey: true,
    hint: 'Ultra-fast inference with free tier available at console.groq.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    baseURL: 'https://api.openai.com/v1',
    placeholderKey: 'sk-...',
    requiresKey: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'openai',
    baseURL: 'https://api.deepseek.com/v1',
    placeholderKey: 'sk-...',
    requiresKey: true,
    hint: 'DeepSeek-V3 and DeepSeek-R1 models',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'openai',
    baseURL: 'https://openrouter.ai/api/v1',
    placeholderKey: 'sk-or-v1-...',
    requiresKey: true,
    hint: 'Unified access to hundreds of open & closed models',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    type: 'openai',
    baseURL: 'http://localhost:11434/v1',
    placeholderKey: 'Not required',
    requiresKey: false,
    hint: 'Local LLMs running via Ollama. No API key needed.',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    type: 'anthropic',
    baseURL: '',
    placeholderKey: 'sk-ant-...',
    requiresKey: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    type: 'gemini',
    baseURL: '',
    placeholderKey: 'AIzaSy...',
    requiresKey: true,
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (Local)',
    type: 'openai',
    baseURL: 'http://localhost:1234/v1',
    placeholderKey: 'Not required',
    requiresKey: false,
    hint: 'Local models served via LM Studio local server.',
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-Compatible',
    type: 'openai',
    baseURL: '',
    placeholderKey: 'API key (if required)',
    requiresKey: false,
    hint: 'Enter any OpenAI-compatible server URL (vLLM, Together, Mistral, etc.)',
  },
];

const EMBEDDING_PRESETS: Preset[] = [
  {
    id: 'transformers',
    name: 'Transformers (Local Built-in)',
    type: 'transformers',
    baseURL: '',
    placeholderKey: 'None needed',
    requiresKey: false,
    hint: 'Runs locally directly on your machine. 100% free with zero configuration.',
  },
  {
    id: 'openai_embed',
    name: 'OpenAI Embeddings',
    type: 'openai',
    baseURL: 'https://api.openai.com/v1',
    placeholderKey: 'sk-...',
    requiresKey: true,
    hint: 'Standard text-embedding-3-small and text-embedding-3-large',
  },
  {
    id: 'ollama_embed',
    name: 'Ollama Embeddings (Local)',
    type: 'openai',
    baseURL: 'http://localhost:11434/v1',
    placeholderKey: 'Not required',
    requiresKey: false,
    hint: 'Embeddings like nomic-embed-text or bge-m3 via local Ollama.',
  },
  {
    id: 'voyage',
    name: 'Voyage AI',
    type: 'openai',
    baseURL: 'https://api.voyageai.com/v1',
    placeholderKey: 'pa-...',
    requiresKey: true,
    hint: 'State-of-the-art embedding models (voyage-3, voyage-code-2)',
  },
  {
    id: 'together_embed',
    name: 'Together AI',
    type: 'openai',
    baseURL: 'https://api.together.xyz/v1',
    placeholderKey: 'tog_...',
    requiresKey: true,
  },
  {
    id: 'custom_embed',
    name: 'Custom OpenAI-Compatible',
    type: 'openai',
    baseURL: '',
    placeholderKey: 'API key (if required)',
    requiresKey: false,
    hint: 'Enter any OpenAI-compatible embeddings server URL',
  },
];

interface AddProviderModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  mode: 'llm' | 'embedding';
  setProviders: React.Dispatch<React.SetStateAction<ConfigModelProvider[]>>;
}

const AddProviderModal = ({
  isOpen,
  setIsOpen,
  mode,
  setProviders,
}: AddProviderModalProps) => {
  const presets = mode === 'llm' ? LLM_PRESETS : EMBEDDING_PRESETS;
  const [selectedPreset, setSelectedPreset] = useState<Preset>(presets[0]);
  const [name, setName] = useState(presets[0].name);
  const [baseURL, setBaseURL] = useState(presets[0].baseURL);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const [discoveredModels, setDiscoveredModels] = useState<Model[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [customModelInput, setCustomModelInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state whenever preset changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const initialPreset = mode === 'llm' ? LLM_PRESETS[0] : EMBEDDING_PRESETS[0];
      applyPreset(initialPreset);
    }
  }, [isOpen, mode]);

  const applyPreset = (preset: Preset) => {
    setSelectedPreset(preset);
    setName(preset.name);
    setBaseURL(preset.baseURL);
    setFetchError(null);
    setDiscoveredModels([]);

    // If preset is transformers (local), immediately discover local models
    if (preset.type === 'transformers') {
      fetchDiscoveredModels(preset.type, '', '');
    }
  };

  const fetchDiscoveredModels = async (
    type: string,
    url: string,
    key: string,
  ) => {
    setIsFetching(true);
    setFetchError(null);

    try {
      const res = await fetch('/api/providers/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type,
          baseURL: url,
          apiKey: key,
        }),
      });

      const data = await res.json();
      if (!data.success && data.error) {
        setFetchError(data.error);
        toast.error(data.error);
        return;
      }

      const models: Model[] =
        mode === 'llm' ? data.models.chat : data.models.embedding;

      if (models.length > 0) {
        setDiscoveredModels(models);
        toast.success(`Discovered ${models.length} ${mode.toUpperCase()} models!`);
      } else {
        // If the endpoint had models but they fell into other category, check both
        const allModels = [...(data.models.chat || []), ...(data.models.embedding || [])];
        if (allModels.length > 0) {
          setDiscoveredModels(allModels);
          toast.success(`Discovered ${allModels.length} models!`);
        } else {
          setFetchError('No models returned. You can manually enter your model key below.');
        }
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to reach endpoint');
      toast.error('Failed to fetch models');
    } finally {
      setIsFetching(false);
    }
  };

  const handleManualAddModel = () => {
    const trimmed = customModelInput.trim();
    if (!trimmed) return;
    if (!discoveredModels.some((m) => m.key === trimmed)) {
      setDiscoveredModels((prev) => [...prev, { key: trimmed, name: trimmed }]);
    }
    setCustomModelInput('');
  };

  const handleRemoveModel = (key: string) => {
    setDiscoveredModels((prev) => prev.filter((m) => m.key !== key));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please provide a connection name.');
      return;
    }
    if (selectedPreset.requiresKey && !apiKey.trim()) {
      toast.error('Please provide an API key.');
      return;
    }

    setIsSaving(true);
    try {
      // Build provider config
      const config: Record<string, any> = {};
      if (selectedPreset.type === 'openai') {
        config.apiKey = apiKey.trim();
        config.baseURL = baseURL.trim() || 'https://api.openai.com/v1';
      } else if (selectedPreset.type === 'anthropic' || selectedPreset.type === 'gemini') {
        config.apiKey = apiKey.trim();
      }

      const payload = {
        type: selectedPreset.type,
        name: name.trim(),
        config,
        chatModels: mode === 'llm' ? discoveredModels : [],
        embeddingModels: mode === 'embedding' ? discoveredModels : [],
      };

      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to create provider');
      }

      const result = await res.json();
      const savedProvider: ConfigModelProvider = result.provider;

      setProviders((prev) => [...prev, savedProvider]);
      toast.success(`${name} connection added successfully!`);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('config-updated'));
        window.dispatchEvent(new CustomEvent('client-config-changed'));
      }

      setIsOpen(false);
    } catch (err: any) {
      console.error('Error saving provider:', err);
      toast.error(err.message || 'Failed to save connection.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          static
          open={isOpen}
          onClose={() => setIsOpen(false)}
          className="relative z-[70]"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 flex w-screen items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
          >
            <DialogPanel className="w-full max-w-xl max-h-[90vh] flex flex-col bg-[#191a1a] border border-[#2a2b2b] rounded-2xl shadow-2xl overflow-hidden text-white">
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#262828] flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#20B8CD]/10 text-[#20B8CD]">
                    {mode === 'llm' ? <Brain size={18} /> : <Layers size={18} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      Add {mode === 'llm' ? 'LLM Provider' : 'Embedding Provider'}
                    </h3>
                    <p className="text-[11px] text-white/50">
                      {mode === 'llm'
                        ? 'Connect an OpenAI-compatible URL or select a popular preset'
                        : 'Connect an embedding endpoint or use local built-in transformers'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-[#262828] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-y-auto">
                <div className="px-6 py-4 space-y-5">
                  {/* Preset Selector Grid */}
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-white/50 mb-2 block">
                      Choose Preset or Custom
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {presets.map((p) => {
                        const isSelected = selectedPreset.id === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => applyPreset(p)}
                            className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                              isSelected
                                ? 'bg-[#20B8CD]/10 border-[#20B8CD] text-white shadow-sm'
                                : 'bg-[#202222] border-[#2c2d2d] text-white/70 hover:border-[#383939] hover:text-white'
                            }`}
                          >
                            <span className="text-xs font-medium leading-tight">
                              {p.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Provider Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/80">
                      Connection Name <span className="text-[#20B8CD]">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Groq, DeepSeek, My vLLM"
                      required
                      className="w-full px-3.5 py-2.5 bg-[#202222] border border-[#2c2d2d] rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#20B8CD] transition-colors"
                    />
                  </div>

                  {/* Base URL (if OpenAI-compatible) */}
                  {selectedPreset.type === 'openai' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-white/80">
                          OpenAI-Compatible Base URL <span className="text-[#20B8CD]">*</span>
                        </label>
                        {selectedPreset.id !== 'custom' && selectedPreset.id !== 'custom_embed' && (
                          <span className="text-[10px] text-white/40">Pre-configured</span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={baseURL}
                          onChange={(e) => setBaseURL(e.target.value)}
                          placeholder="https://api.example.com/v1"
                          required
                          className="w-full px-3.5 py-2.5 bg-[#202222] border border-[#2c2d2d] rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#20B8CD] font-mono transition-colors"
                        />
                      </div>
                      {selectedPreset.hint && (
                        <p className="text-[11px] text-white/45">{selectedPreset.hint}</p>
                      )}
                    </div>
                  )}

                  {/* API Key (if not transformers) */}
                  {selectedPreset.type !== 'transformers' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-white/80">
                          API Key{' '}
                          {selectedPreset.requiresKey ? (
                            <span className="text-[#20B8CD]">*</span>
                          ) : (
                            <span className="text-[10px] text-white/40 font-normal">
                              (Optional for local)
                            </span>
                          )}
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={selectedPreset.placeholderKey}
                          required={selectedPreset.requiresKey}
                          className="w-full pl-3.5 pr-10 py-2.5 bg-[#202222] border border-[#2c2d2d] rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#20B8CD] font-mono transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                        >
                          {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Auto-Discovery & Models Section */}
                  <div className="p-3.5 rounded-xl bg-[#202222] border border-[#2c2d2d] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={14} className="text-[#20B8CD]" />
                        <span className="text-xs font-medium text-white">
                          Available Models
                        </span>
                        {discoveredModels.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#20B8CD]/15 text-[#20B8CD]">
                            {discoveredModels.length}
                          </span>
                        )}
                      </div>

                      {selectedPreset.type !== 'transformers' && (
                        <button
                          type="button"
                          onClick={() =>
                            fetchDiscoveredModels(
                              selectedPreset.type,
                              baseURL,
                              apiKey,
                            )
                          }
                          disabled={isFetching || (selectedPreset.requiresKey && !apiKey)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#262828] hover:bg-[#2e3030] text-[#20B8CD] disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          {isFetching ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <RefreshCw size={12} />
                          )}
                          <span>{isFetching ? 'Fetching...' : 'Fetch Models'}</span>
                        </button>
                      )}
                    </div>

                    {fetchError && (
                      <p className="text-[11px] text-red-400 bg-red-500/10 px-2.5 py-1.5 rounded-lg">
                        {fetchError}
                      </p>
                    )}

                    {/* Discovered Model Badges */}
                    {discoveredModels.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {discoveredModels.map((model) => (
                          <span
                            key={model.key}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-[#191a1a] border border-[#303232] text-white/90"
                          >
                            <span className="truncate max-w-[200px]">{model.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveModel(model.key)}
                              className="text-white/40 hover:text-red-400 transition-colors"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-white/40 italic">
                        {isFetching
                          ? 'Contacting provider endpoint to discover available models...'
                          : selectedPreset.type === 'transformers'
                            ? 'Local models loaded automatically.'
                            : 'Click "Fetch Models" after entering your API key or add model names manually below.'}
                      </p>
                    )}

                    {/* Manual Model Addition Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={customModelInput}
                        onChange={(e) => setCustomModelInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleManualAddModel();
                          }
                        }}
                        placeholder="Add custom model key (e.g. gpt-4o, llama-3.3-70b)..."
                        className="flex-1 px-3 py-1.5 bg-[#191a1a] border border-[#2c2d2d] rounded-lg text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#20B8CD]"
                      />
                      <button
                        type="button"
                        onClick={handleManualAddModel}
                        disabled={!customModelInput.trim()}
                        className="px-3 py-1.5 rounded-lg bg-[#262828] hover:bg-[#303232] disabled:opacity-40 text-white text-xs font-medium transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#262828] bg-[#191a1a] flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-[#262828] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#20B8CD] hover:bg-[#1ca3b5] text-black font-semibold shadow-sm active:scale-95 disabled:opacity-60 transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save Connection'}</span>
                  </button>
                </div>
              </form>
            </DialogPanel>
          </motion.div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default AddProviderModal;
