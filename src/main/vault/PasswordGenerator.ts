import { randomInt } from 'node:crypto';
import type { GeneratorOptions } from '@/shared/types';

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

const AMBIGUOUS = new Set(['0', 'O', 'o', 'l', 'I', '1']);

export class PasswordGenerator {
  static generate(options: GeneratorOptions): string {
    let chars = '';
    if (options.uppercase) chars += CHARSETS.uppercase;
    if (options.lowercase) chars += CHARSETS.lowercase;
    if (options.numbers) chars += CHARSETS.numbers;
    if (options.symbols) chars += CHARSETS.symbols;
    if (!chars) chars = CHARSETS.lowercase + CHARSETS.numbers;
    if (options.excludeAmbiguous) chars = [...chars].filter((char) => !AMBIGUOUS.has(char)).join('');

    let out = '';
    for (let i = 0; i < Math.max(12, Math.min(64, options.length)); i += 1) {
      out += chars[randomInt(0, chars.length)];
    }
    return out;
  }

  static generateMemorable(wordCount: number): string {
    const words = ['orbit', 'signal', 'forest', 'amber', 'cipher', 'voyage', 'delta', 'harbor', 'silent', 'matrix'];
    const selected = Array.from({ length: Math.max(3, wordCount) }, () => words[randomInt(0, words.length)]);
    return `${selected.join('-')}-${randomInt(1000, 9999)}`;
  }

  static calculateEntropy(password: string): number {
    const unique = new Set(password.split('')).size;
    return Math.log2(unique ** password.length);
  }
}
