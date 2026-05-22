import { env } from '../config/environment.js';
import type { ChunkOptions, ChunkResult } from '../types/index.js';

interface PageRange {
  pageNumber: number;
  start: number;
  end: number;
}

const PAGE_MARKER_PATTERN = /--- PAGE (\d+) ---/g;
const TOKEN_CHAR_RATIO = 4;
const MIN_TOKENS = 50;

const estimateTokens = (text: string): number => Math.max(1, Math.ceil(text.length / TOKEN_CHAR_RATIO));

const buildPageRanges = (text: string): PageRange[] => {
  const markers = Array.from(text.matchAll(PAGE_MARKER_PATTERN));
  if (markers.length === 0) {
    return [];
  }

  return markers.map((marker, index) => ({
    pageNumber: Number(marker[1]),
    start: marker.index,
    end: markers[index + 1]?.index ?? text.length,
  }));
};

const pagesForRange = (pageRanges: PageRange[], start: number, end: number): number[] => {
  const pageNumbers = pageRanges
    .filter((page) => page.start <= end && page.end >= start)
    .map((page) => page.pageNumber);

  return Array.from(new Set(pageNumbers));
};

const findBoundary = (text: string, start: number, targetEnd: number): number => {
  if (targetEnd >= text.length) {
    return text.length;
  }

  const lowerBound = start + Math.floor((targetEnd - start) * 0.65);
  const searchWindow = text.slice(lowerBound, Math.min(text.length, targetEnd + 400));
  const paragraphOffset = searchWindow.search(/\n{2,}/);
  if (paragraphOffset >= 0) {
    return lowerBound + paragraphOffset;
  }

  const sentenceMatches = Array.from(searchWindow.matchAll(/[.!?]\s+/g));
  const sentenceMatch = sentenceMatches.at(-1);
  if (sentenceMatch?.index !== undefined) {
    return lowerBound + sentenceMatch.index + 1;
  }

  return targetEnd;
};

const cleanChunkContent = (value: string): string =>
  value.replace(PAGE_MARKER_PATTERN, '').replace(/\s+/g, ' ').trim();

/** Splits extracted course text into overlapping chunks for embedding. */
export const chunkText = (text: string, options: ChunkOptions = {}): ChunkResult[] => {
  const targetChars = (options.chunkSize ?? env.chunkSize) * TOKEN_CHAR_RATIO;
  const overlapChars = Math.min((options.chunkOverlap ?? env.chunkOverlap) * TOKEN_CHAR_RATIO, targetChars - TOKEN_CHAR_RATIO);
  const pageRanges = buildPageRanges(text);
  const chunks: ChunkResult[] = [];

  let start = 0;
  while (start < text.length) {
    while (/\s/.test(text[start] ?? '') && start < text.length) {
      start += 1;
    }

    const targetEnd = Math.min(text.length, start + targetChars);
    const end = findBoundary(text, start, targetEnd);
    const rawContent = text.slice(start, end);
    const content = cleanChunkContent(rawContent);
    const tokenCount = estimateTokens(content);

    if (content.length > 0 && (tokenCount >= MIN_TOKENS || end >= text.length)) {
      chunks.push({
        content,
        chunkIndex: chunks.length,
        pageNumbers: pagesForRange(pageRanges, start, end),
        startChar: start,
        endChar: end,
        tokenCount,
      });
    }

    if (end >= text.length) {
      break;
    }

    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
};
