import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, relative, basename } from 'node:path';
// Manual upload tools may omit folders named node_modules, even exported assets.
const root = 'dist';
async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else result.push(path);
  }
  return result;
}
const files = await walk(root);
const replacements = [];
await mkdir(join(root, 'fonts'), { recursive: true });
for (const file of files.filter(path => /\.(ttf|woff2?)$/i.test(path))) {
  const oldPath = relative(root, file).replaceAll('\\', '/');
  const newPath = `fonts/${basename(file)}`;
  if (oldPath === newPath) continue;
  await copyFile(file, join(root, newPath));
  replacements.push([oldPath, newPath]);
}
for (const file of files.filter(path => /\.(js|css|html|json)$/i.test(path))) {
  const original = await readFile(file, 'utf8');
  let content = original;
  for (const [before, after] of replacements) content = content.replaceAll(before, after);
  if (content !== original) await writeFile(file, content);
}
console.log(`Prepared ${replacements.length} fonts for static hosting.`);
