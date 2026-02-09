import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPTS_DIR = path.join(__dirname, '../prompts');

export function readPrompt(name: string): string {
  const promptPath = path.join(PROMPTS_DIR, `${name}.md`);
  const content = fs.readFileSync(promptPath, 'utf-8');
  return content.trim();
}
