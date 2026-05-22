const MOJIBAKE_PATTERN = /[ÃÂÄÆÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëÌ]/;

/** Fixes UTF-8 filenames that were decoded as latin1 by multipart parsers. */
export const decodePossiblyMojibakeFilename = (value: string): string => {
  if (!MOJIBAKE_PATTERN.test(value)) {
    return value.normalize('NFC');
  }

  const decoded = Buffer.from(value, 'latin1').toString('utf8').normalize('NFC');
  return decoded.includes('\uFFFD') ? value.normalize('NFC') : decoded;
};
