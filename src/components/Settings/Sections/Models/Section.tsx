import React, { useState } from 'react';
import {
  ConfigModelProvider,
  ModelProviderUISection,
  UIConfigField,
} from '@/lib/config/types';
import ModelProvider from './ModelProvider';
import ModelSelect from './ModelSelect';
import AddProviderModal from './AddProviderModal';
import { Brain, Layers, Plus, Sparkles } from 'lucide-react';

const Models = ({
  fields,
  values,
}: {
  fields: ModelProviderUISection[];
  values: ConfigModelProvider[];
}) => {
  const [providers, setProviders] = useState<ConfigModelProvider[]>(values);
  const [activeTab, setActiveTab] = useState<'llm' | 'embedding'>('llm');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const llmProviders = providers.filter(
    (p) => p.type !== 'transformers' || p.chatModels.length > 0,
  );
  const embeddingProviders = providers.filter(
    (p) => p.type === 'transformers' || p.embeddingModels.length > 0,
  );

  const llmModelCount = llmProviders.reduce(
    (acc, p) => acc + p.chatModels.filter((m) => m.key !== 'error').length,
    0,
  );
  const embeddingModelCount = embeddingProviders.reduce(
    (acc, p) =>
      acc + p.embeddingModels.filter((m) => m.key !== 'error').length,
    0,
  );

  return (
    <div className="flex-1 space-y-6 overflow-y-auto py-6">
      {/* Top Segmented Tabs: LLMs vs Embeddings */}
      <div className="px-6">
        <div className="p-1 bg-light-secondary/60 dark:bg-[#1a1b1b] border border-light-200/80 dark:border-[#282a2a] rounded-xl flex items-center gap-1 w-full max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab('llm')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              activeTab === 'llm'
                ? 'bg-white dark:bg-[#262828] text-black dark:text-white shadow-sm font-semibold'
                : 'text-black/60 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            <Brain
              size={14}
              className={
                activeTab === 'llm'
                  ? 'text-[#20B8CD]'
                  : 'text-black/40 dark:text-white/40'
              }
            />
            <span>LLMs (Chat)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'llm'
                  ? 'bg-[#20B8CD]/15 text-[#20B8CD]'
                  : 'bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/40'
              }`}
            >
              {llmModelCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('embedding')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              activeTab === 'embedding'
                ? 'bg-white dark:bg-[#262828] text-black dark:text-white shadow-sm font-semibold'
                : 'text-black/60 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            <Layers
              size={14}
              className={
                activeTab === 'embedding'
                  ? 'text-[#20B8CD]'
                  : 'text-black/40 dark:text-white/40'
              }
            />
            <span>Embeddings</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'embedding'
                  ? 'bg-[#20B8CD]/15 text-[#20B8CD]'
                  : 'bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/40'
              }`}
            >
              {embeddingModelCount}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: LLMs View */}
      {activeTab === 'llm' && (
        <div className="space-y-6">

          {/* Manage LLM Providers Header */}
          <div className="flex flex-row justify-between items-center px-6">
            <div>
              <p className="text-xs font-medium text-black/80 dark:text-white/80">
                LLM Providers & Connections
              </p>
              <p className="text-[11px] text-black/50 dark:text-white/40">
                OpenAI-compatible endpoints or pre-configured services
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20B8CD] hover:bg-[#1ca3b5] text-black font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add LLM Provider</span>
            </button>
          </div>

          {/* Provider Cards */}
          <div className="flex flex-col px-6 gap-y-4">
            {llmProviders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl border border-dashed border-light-200 dark:border-[#2c2d2d] bg-light-secondary/20 dark:bg-[#191a1a]">
                <div className="p-3 rounded-full bg-[#20B8CD]/10 mb-3">
                  <Brain className="w-6 h-6 text-[#20B8CD]" />
                </div>
                <p className="text-sm font-medium text-black/80 dark:text-white/80 mb-1">
                  No LLM providers connected
                </p>
                <p className="text-xs text-black/50 dark:text-white/45 text-center max-w-sm mb-4">
                  Add an OpenAI-compatible endpoint or popular preset (Groq, OpenAI,
                  DeepSeek, Ollama, etc.) to discover models automatically.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20B8CD] hover:bg-[#1ca3b5] text-black font-semibold text-xs transition-all shadow-sm cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add LLM Provider</span>
                </button>
              </div>
            ) : (
              llmProviders.map((provider) => (
                <ModelProvider
                  key={`llm-provider-${provider.id}`}
                  fields={
                    (fields.find((f) => f.key === provider.type)?.fields ??
                      []) as UIConfigField[]
                  }
                  modelProvider={provider}
                  setProviders={setProviders}
                  viewMode="llm"
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Embeddings View */}
      {activeTab === 'embedding' && (
        <div className="space-y-6">
          {/* Active Embedding Model Selector */}
          <div className="flex flex-col px-6 gap-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/50">
              Active Embedding Model
            </h3>
            <ModelSelect
              providers={providers.filter((p) =>
                p.embeddingModels.some((m) => m.key !== 'error'),
              )}
              type="embedding"
            />
          </div>

          <div className="border-t border-light-200/60 dark:border-dark-200/60" />

          {/* Manage Embedding Providers Header */}
          <div className="flex flex-row justify-between items-center px-6">
            <div>
              <p className="text-xs font-medium text-black/80 dark:text-white/80">
                Embedding Providers
              </p>
              <p className="text-[11px] text-black/50 dark:text-white/40">
                Local built-in Transformers, OpenAI, Ollama, Voyage, or custom endpoints
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20B8CD] hover:bg-[#1ca3b5] text-black font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Embedding Provider</span>
            </button>
          </div>

          {/* Provider Cards */}
          <div className="flex flex-col px-6 gap-y-4">
            {embeddingProviders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl border border-dashed border-light-200 dark:border-[#2c2d2d] bg-light-secondary/20 dark:bg-[#191a1a]">
                <div className="p-3 rounded-full bg-[#20B8CD]/10 mb-3">
                  <Layers className="w-6 h-6 text-[#20B8CD]" />
                </div>
                <p className="text-sm font-medium text-black/80 dark:text-white/80 mb-1">
                  No embedding providers connected
                </p>
                <p className="text-xs text-black/50 dark:text-white/45 text-center max-w-sm mb-4">
                  Add local built-in transformers or an external embedding endpoint
                  to enable semantic search and document reranking.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20B8CD] hover:bg-[#1ca3b5] text-black font-semibold text-xs transition-all shadow-sm cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Embedding Provider</span>
                </button>
              </div>
            ) : (
              embeddingProviders.map((provider) => (
                <ModelProvider
                  key={`embed-provider-${provider.id}`}
                  fields={
                    (fields.find((f) => f.key === provider.type)?.fields ??
                      []) as UIConfigField[]
                  }
                  modelProvider={provider}
                  setProviders={setProviders}
                  viewMode="embedding"
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Provider Modal (LLM or Embedding mode) */}
      <AddProviderModal
        isOpen={isAddModalOpen}
        setIsOpen={setIsAddModalOpen}
        mode={activeTab}
        setProviders={setProviders}
      />
    </div>
  );
};

export default Models;
