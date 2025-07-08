import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Declare Bun global to avoid TypeScript errors
declare global {
  var Bun: any;
}

// Runtime detection
const isBun = typeof Bun !== 'undefined';

interface CachedContent {
  content: string;
  timestamp: number;
  etag?: string;
}

export class DocumentationCache {
  private memoryCache = new Map<string, CachedContent>();
  private cacheDir: string;
  private memoryTTL: number;
  private diskTTL: number;

  constructor(
    cacheDir: string = process.env.VERCEL ? '/tmp/enso-cache' : (process.env.TMPDIR || '.cache'),
    memoryTTL: number = 3600000, // 1 hour
    diskTTL: number = 86400000   // 24 hours
  ) {
    this.cacheDir = cacheDir;
    this.memoryTTL = memoryTTL;
    this.diskTTL = diskTTL;
  }

  async get(key: string): Promise<string | null> {
    const memCached = this.memoryCache.get(key);
    if (memCached && Date.now() - memCached.timestamp < this.memoryTTL) {
      return memCached.content;
    }

    const diskPath = this.getDiskPath(key);
    
    try {
      let content: string;
      let mtime: Date;
      
      if (isBun) {
        const file = Bun.file(diskPath);
        if (await file.exists()) {
          const stat = await file.stat();
          mtime = stat.mtime;
          content = await file.text();
        } else {
          return null;
        }
      } else {
        try {
          const stat = await fs.stat(diskPath);
          mtime = stat.mtime;
          content = await fs.readFile(diskPath, 'utf-8');
        } catch (error) {
          return null;
        }
      }
      
      if (Date.now() - mtime.getTime() < this.diskTTL) {
        this.memoryCache.set(key, { 
          content, 
          timestamp: Date.now() 
        });
        return content;
      }
    } catch (error) {
      // File doesn't exist or error reading
    }

    return null;
  }

  async set(key: string, content: string, etag?: string): Promise<void> {
    this.memoryCache.set(key, { 
      content, 
      timestamp: Date.now(),
      etag 
    });

    await this.ensureCacheDir();
    const diskPath = this.getDiskPath(key);
    
    if (isBun) {
      await Bun.write(diskPath, content);
    } else {
      await fs.writeFile(diskPath, content, 'utf-8');
    }
  }

  async has(key: string): Promise<boolean> {
    const cached = await this.get(key);
    return cached !== null;
  }

  async getEtag(key: string): Promise<string | null> {
    const memCached = this.memoryCache.get(key);
    return memCached?.etag || null;
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();

    try {
      if (isBun) {
        const proc = Bun.spawn(["rm", "-rf", this.cacheDir]);
        await proc.exited;
      } else {
        await fs.rm(this.cacheDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Directory doesn't exist
    }
  }

  async prune(): Promise<void> {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (now - value.timestamp > this.memoryTTL) {
        this.memoryCache.delete(key);
      }
    }

    try {
      if (isBun) {
        const globPattern = new Bun.Glob("*.cache");
        for await (const file of globPattern.scan(this.cacheDir)) {
          const filePath = `${this.cacheDir}/${file}`;
          const fileObj = Bun.file(filePath);
          const stat = await fileObj.stat();
          if (now - stat.mtime.getTime() > this.diskTTL) {
            await Bun.$`rm ${filePath}`.quiet();
          }
        }
      } else {
        const files = await glob('*.cache', { cwd: this.cacheDir });
        for (const file of files) {
          const filePath = path.join(this.cacheDir, file);
          const stat = await fs.stat(filePath);
          if (now - stat.mtime.getTime() > this.diskTTL) {
            await fs.unlink(filePath);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist
    }
  }

  private getDiskPath(key: string): string {
    const hash = createHash('md5').update(key).digest('hex');
    if (isBun) {
      return `${this.cacheDir}/${hash}.cache`;
    } else {
      return path.join(this.cacheDir, `${hash}.cache`);
    }
  }

  private async ensureCacheDir(): Promise<void> {
    if (isBun) {
      await Bun.$`mkdir -p ${this.cacheDir}`.quiet();
    } else {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  async getStats(): Promise<{
    memoryEntries: number;
    memorySize: number;
    diskEntries: number;
    diskSize: number;
  }> {
    let memorySize = 0;
    for (const [key, value] of this.memoryCache.entries()) {
      memorySize += key.length + value.content.length;
    }

    let diskEntries = 0;
    let diskSize = 0;
    
    try {
      if (isBun) {
        const globPattern = new Bun.Glob("*.cache");
        for await (const file of globPattern.scan(this.cacheDir)) {
          diskEntries++;
          const filePath = `${this.cacheDir}/${file}`;
          const fileObj = Bun.file(filePath);
          const stat = await fileObj.stat();
          diskSize += stat.size;
        }
      } else {
        const files = await glob('*.cache', { cwd: this.cacheDir });
        for (const file of files) {
          diskEntries++;
          const filePath = path.join(this.cacheDir, file);
          const stat = await fs.stat(filePath);
          diskSize += stat.size;
        }
      }
    } catch (error) {
      // Directory doesn't exist
    }

    return {
      memoryEntries: this.memoryCache.size,
      memorySize,
      diskEntries,
      diskSize
    };
  }
}