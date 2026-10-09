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

export const getSearchProvider = () =>
  configManager.getConfig('search.provider', process.env.SEARCH_PROVIDER || 'auto');

export const getFourgetURL = () =>
  configManager.getConfig(
    'search.fourgetURL',
    process.env.FOURGET_URL || process.env.FOURGET_API_URL || 'http://4get-app',
  );

export const getFourgetScraper = () =>
  configManager.getConfig('search.fourgetScraper', process.env.FOURGET_SCRAPER || 'ddg');

export const getSearxngURL = () =>
  configManager.getConfig('search.searxngURL', process.env.SEARXNG_API_URL || '');

