import { getFourgetURL, getFourgetScraper } from './config/serverRegistry';

export interface FourgetSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
  scraper?: string;
  country?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  img_src?: string;
  thumbnail_src?: string;
  thumbnail?: string;
  content?: string;
  author?: string;
  iframe_src?: string;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const normalizeFourgetURL = (rawUrl?: string): string => {
  let url = (rawUrl || '').trim();
  if (!url) {
    url = process.env.FOURGET_URL || process.env.FOURGET_API_URL || 'http://4get-app';
  }
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/api\/v1$/, '');
  return url;
};

export const search4get = async (
  query: string,
  opts?: FourgetSearchOptions,
): Promise<{ results: SearchResult[]; suggestions: string[] }> => {
  const baseUrl = normalizeFourgetURL(getFourgetURL());
  const defaultScraper = getFourgetScraper() || 'ddg';

  const isImages =
    opts?.categories?.some((c) => c.toLowerCase().includes('image')) ||
    opts?.engines?.some((e) => e.toLowerCase().includes('image'));

  const isVideos =
    opts?.categories?.some((c) => c.toLowerCase().includes('video')) ||
    opts?.engines?.some(
      (e) =>
        e.toLowerCase().includes('video') || e.toLowerCase().includes('youtube'),
    );

  const isNews =
    opts?.categories?.some((c) => c.toLowerCase().includes('news')) ||
    opts?.engines?.some((e) => e.toLowerCase().includes('news'));

  let endpoint = `${baseUrl}/api/v1/web`;
  if (isImages) {
    endpoint = `${baseUrl}/api/v1/images`;
  } else if (isVideos) {
    endpoint = `${baseUrl}/api/v1/videos`;
  } else if (isNews) {
    endpoint = `${baseUrl}/api/v1/news`;
  }

  const url = new URL(endpoint);
  url.searchParams.append('s', query);

  if (!isImages && !isVideos && !isNews) {
    url.searchParams.append('extendedsearch', 'true');
  }

  const scraper = opts?.scraper || defaultScraper;
  if (scraper && scraper !== 'auto') {
    url.searchParams.append('scraper', scraper);
  }

  if (opts?.country) {
    url.searchParams.append('country', opts.country);
  } else if (opts?.language) {
    const lang = opts.language.toLowerCase();
    if (lang === 'pl') {
      url.searchParams.append('country', 'pl-pl');
    } else if (lang === 'en') {
      url.searchParams.append('country', 'us-en');
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`4get error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (data.status !== 'ok') {
      throw new Error(`4get response status: ${data.status}`);
    }

    const results: SearchResult[] = [];
    const suggestions: string[] = [];

    if (isImages) {
      if (Array.isArray(data.image)) {
        for (const item of data.image) {
          if (item?.url) {
            const imgSrc = item.source?.[0]?.url || item.url;
            const thumb =
              item.source?.[1]?.url || item.source?.[0]?.url || imgSrc;
            results.push({
              title: item.title || '',
              url: item.url,
              img_src: imgSrc,
              thumbnail_src: thumb,
              thumbnail: thumb,
            });
          }
        }
      }
    } else if (isVideos) {
      if (Array.isArray(data.video)) {
        for (const item of data.video) {
          if (item?.url) {
            let iframe_src = '';
            const ytMatch = item.url.match(
              /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/,
            );
            if (ytMatch) {
              iframe_src = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
            } else {
              iframe_src = item.url;
            }
            const thumb = item.thumb?.url || '';
            results.push({
              title: item.title || '',
              url: item.url,
              content: item.description || '',
              thumbnail: thumb,
              img_src: thumb,
              iframe_src,
            });
          }
        }
      }
    } else if (isNews) {
      if (Array.isArray(data.news)) {
        for (const item of data.news) {
          if (item?.url) {
            results.push({
              title: item.title || '',
              url: item.url,
              content: item.description || '',
              author: item.author || '',
            });
          }
        }
      }
      if (results.length === 0 && !query.startsWith('site:')) {
        return search4get(query, { ...opts, categories: ['general'] });
      }
    } else {
      if (Array.isArray(data.answer)) {
        for (const ans of data.answer) {
          if (ans?.title && Array.isArray(ans.description)) {
            const text = ans.description
              .filter((d: any) => d?.value)
              .map((d: any) => d.value)
              .join(' ');
            if (text) {
              results.push({
                title: ans.title,
                content: text,
                url: data.web?.[0]?.url || baseUrl,
              });
            }
          }
        }
      }

      if (Array.isArray(data.web)) {
        for (const item of data.web) {
          if (item?.url && (item.title || item.description)) {
            results.push({
              title: item.title || item.url,
              url: item.url,
              content: item.description || item.title || '',
            });
          }
        }
      }

      if (Array.isArray(data.related)) {
        suggestions.push(
          ...data.related.filter((r: any) => typeof r === 'string'),
        );
      }
      if (
        data.spelling?.correction &&
        !suggestions.includes(data.spelling.correction)
      ) {
        suggestions.push(data.spelling.correction);
      }
    }

    return { results, suggestions };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('4get search timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};
