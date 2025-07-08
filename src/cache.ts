import { createHash } from 'crypto';

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
    cacheDir: string = process.env.TMPDIR || '.cache',
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
    const file = Bun.file(diskPath);
    
    if (await file.exists()) {
      const stat = await file.stat();
      if (Date.now() - stat.mtime.getTime() < this.diskTTL) {
        const content = await file.text();
        this.memoryCache.set(key, { 
          content, 
          timestamp: Date.now() 
        });
        return content;
      }
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
    await Bun.write(diskPath, content);
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
      const proc = Bun.spawn(["rm", "-rf", this.cacheDir]);
      await proc.exited;
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
      const glob = new Bun.Glob("*.cache");
      for await (const file of glob.scan(this.cacheDir)) {
        const filePath = `${this.cacheDir}/${file}`;
        const fileObj = Bun.file(filePath);
        const stat = await fileObj.stat();
        if (now - stat.mtime.getTime() > this.diskTTL) {
          await Bun.$`rm ${filePath}`.quiet();
        }
      }
    } catch (error) {
      // Directory doesn't exist
    }
  }

  private getDiskPath(key: string): string {
    const hash = createHash('md5').update(key).digest('hex');
    return `${this.cacheDir}/${hash}.cache`;
  }

  private async ensureCacheDir(): Promise<void> {
    await Bun.$`mkdir -p ${this.cacheDir}`.quiet();
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
      const glob = new Bun.Glob("*.cache");
      for await (const file of glob.scan(this.cacheDir)) {
        diskEntries++;
        const filePath = `${this.cacheDir}/${file}`;
        const fileObj = Bun.file(filePath);
        const stat = await fileObj.stat();
        diskSize += stat.size;
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