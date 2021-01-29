import fs from 'fs';
import path from 'path';
import os from 'os';
import diff, { merge } from './src/utils/diff';
import { diffLines } from 'diff';

const read = (filename: string): string => {
  const dir = path.resolve(os.homedir(), 'Desktop/diff');
  return fs.readFileSync(path.resolve(dir, filename), { encoding: 'utf-8' });
};

const originalContent = read('original.txt');
const midContent = read('mid.txt');
const newContent = read('new.txt');

const currentChanges = diff(originalContent, midContent);
const newChanges = diff(midContent, newContent);

// console.log(currentChanges);
// console.log();
// console.log(newChanges);
console.log(
  merge(currentChanges, newChanges)
    .map((change) => change.value)
    .join('')
);
