import fs from 'node:fs/promises';

import type { FileType } from '../types/index.js';

const ZIP_SIGNATURES = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
  [0x50, 0x4b, 0x07, 0x08],
];

const startsWithBytes = (buffer: Buffer, bytes: number[]): boolean =>
  bytes.every((byte, index) => buffer[index] === byte);

const isZip = (buffer: Buffer): boolean =>
  ZIP_SIGNATURES.some((signature) => startsWithBytes(buffer, signature));

export const validateFileSignature = async (filePath: string, fileType: FileType): Promise<boolean> => {
  const buffer = await fs.readFile(filePath);

  if (fileType === 'pdf') {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }

  if (!isZip(buffer)) return false;

  const asLatin1 = buffer.toString('latin1');
  if (fileType === 'docx') {
    return asLatin1.includes('word/') || asLatin1.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }

  return asLatin1.includes('ppt/') || asLatin1.includes('application/vnd.openxmlformats-officedocument.presentationml.presentation');
};
