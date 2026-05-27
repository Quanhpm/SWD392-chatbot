import fs from 'node:fs/promises';
import mammoth from 'mammoth';
import officeParser from 'officeparser';
import pdfParse from 'pdf-parse';

import type { IParserPort } from '../ports/IParserPort.js';
import type { FileType, PageText, ParseResult } from '../types/index.js';

interface PdfTextItem {
  str: string;
}

interface PdfTextContent {
  items: PdfTextItem[];
}

interface PdfPageData {
  getTextContent(): Promise<PdfTextContent>;
}

const cleanText = (value: string): string =>
  value
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const parsePdf = async (filePath: string): Promise<ParseResult> => {
  const buffer = await fs.readFile(filePath);
  const pages: PageText[] = [];

  const options = {
    pagerender: async (pageData: PdfPageData): Promise<string> => {
      const content = await pageData.getTextContent();
      const text = cleanText(content.items.map((item) => item.str).join(' '));
      pages.push({ pageNumber: pages.length + 1, text });
      return text;
    },
  };

  const data = await pdfParse(buffer, options);
  const pageList =
    pages.length > 0
      ? pages
      : [{ pageNumber: 1, text: cleanText(data.text) }];

  return {
    text: pageList.map((page) => `--- PAGE ${page.pageNumber} ---\n${page.text}`).join('\n\n'),
    pageCount: data.numpages,
    pages: pageList,
  };
};

const parseDocx = async (filePath: string): Promise<ParseResult> => {
  const result = await mammoth.extractRawText({ path: filePath });
  return { text: cleanText(result.value) };
};

const parsePptx = async (filePath: string): Promise<ParseResult> => {
  const text = await officeParser.parseOfficeAsync(filePath);
  return { text: cleanText(text) };
};

export class ParserAdapter implements IParserPort {
  async parse(filePath: string, fileType: FileType): Promise<ParseResult> {
    try {
      if (fileType === 'pdf') {
        return await parsePdf(filePath);
      }

      if (fileType === 'docx') {
        return await parseDocx(filePath);
      }

      if (fileType === 'pptx') {
        return await parsePptx(filePath);
      }

      throw new Error(`Unsupported file type: ${fileType}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parsing error';
      throw new Error(`Failed to parse ${fileType.toUpperCase()} document: ${message}`);
    }
  }
}
