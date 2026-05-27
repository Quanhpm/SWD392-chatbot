import type { FileType, ParseResult } from '../types/index.js';

export interface IParserPort {
  parse(filePath: string, fileType: FileType): Promise<ParseResult>;
}
