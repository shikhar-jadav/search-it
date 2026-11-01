import configManager from './index';
import { ConfigModelProvider } from './types';

export const getConfiguredModelProviders = (): ConfigModelProvider[] => {
  return configManager.getConfig('modelProviders', []);
};

export const getConfiguredModelProviderById = (
  id: string,
): ConfigModelProvider | undefined => {
  return getConfiguredModelProviders().find((p) => p.id === id) ?? undefined;
};

export const getSearchProvider = (): string =>
  configManager.getConfig('search.provider', 'searxng');

export const getSearxngURL = () =>
  configManager.getConfig('search.searxngURL', '');

export const getTavilyApiKey = () =>
  configManager.getConfig('search.tavilyApiKey', process.env.TAVILY_API_KEY || '');

export const getExaApiKey = () =>
  configManager.getConfig('search.exaApiKey', process.env.EXA_API_KEY || '');
