import { lstat, mkdir, open, unlink } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

export async function sourceStemExists(directory, stem) {
  const folder = join(directory, 'sources');
  const exists = await Promise.all(['.md', '.html', '.json'].map(async extension => {
    try {
      await lstat(join(folder, stem + extension));
      return true;
    } catch {
      // An inaccessible archive mustn't prevent saving the PDF.
      return false;
    }
  }));
  return exists.some(Boolean);
}

export async function archiveSource(pdfPath, input, metadata) {
  const folder = join(dirname(pdfPath), 'sources');
  const stem = basename(pdfPath, '.pdf');
  const [extension, source] = input.markdown === undefined ? ['.html', input.html] : ['.md', input.markdown];
  if (!source.isWellFormed()) throw new Error('Invalid Unicode source');
  const files = [[extension, source], ['.json', JSON.stringify(metadata, null, 2) + '\n']];
  const created = [];
  try {
    await mkdir(folder, { recursive: true, mode: 0o700 });
    if (!(await lstat(folder)).isDirectory()) throw new Error('Invalid source directory');
    for (const [suffix, content] of files) {
      const path = join(folder, stem + suffix);
      const handle = await open(path, 'wx', 0o600);
      created.push(path);
      try {
        await handle.writeFile(content, 'utf8');
      } finally {
        await handle.close();
      }
    }
  } catch (error) {
    await Promise.allSettled(created.map(path => unlink(path)));
    throw error;
  }
}
