import * as puppeteer from 'puppeteer-core';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
import { SourceLocation } from '../schemas';

interface Signal {
  text: string;
  weight: number;
}

interface SourceMapEntry {
  url: string;
  sourceMapURL: string;
  scriptId: string;
}

export class SourceMapResolver {
  private sourceMaps: Map<string, TraceMap> = new Map();
  private sourceContents: Map<string, { sourcePath: string; content: string }[]> = new Map();

  async resolve(
    page: puppeteer.Page,
    signals: Signal[],
    workspaceRoot: string
  ): Promise<SourceLocation | undefined> {
    try {
      // Collect source maps from the page
      const entries = await this.collectSourceMapEntries(page);

      if (entries.length === 0) {
        return undefined;
      }

      // Fetch and parse source maps
      for (const entry of entries) {
        await this.fetchAndParse(page, entry);
      }

      // Search source contents for signals
      return this.searchSourceContents(signals, workspaceRoot);
    } catch (error) {
      console.warn('Source map resolution failed:', error);
      return undefined;
    }
  }

  private async collectSourceMapEntries(page: puppeteer.Page): Promise<SourceMapEntry[]> {
    const client = await page.createCDPSession();
    const entries: SourceMapEntry[] = [];

    try {
      await client.send('Debugger.enable');

      // Get all already-parsed scripts
      const scripts: Array<{ scriptId: string; url: string; sourceMapURL?: string }> = [];

      // Listen for scripts (covers already-loaded ones when we re-enable)
      const listener = (params: any) => {
        if (params.sourceMapURL && params.url) {
          scripts.push({
            scriptId: params.scriptId,
            url: params.url,
            sourceMapURL: params.sourceMapURL,
          });
        }
      };

      client.on('Debugger.scriptParsed', listener);

      // Small wait to collect scriptParsed events for already-loaded scripts
      await new Promise(resolve => setTimeout(resolve, 500));

      client.off('Debugger.scriptParsed', listener);

      for (const script of scripts) {
        entries.push({
          url: script.url,
          sourceMapURL: script.sourceMapURL!,
          scriptId: script.scriptId,
        });
      }

      await client.send('Debugger.disable');
    } catch (error) {
      console.warn('Failed to collect source map entries:', error);
    } finally {
      await client.detach().catch(() => {});
    }

    return entries;
  }

  private async fetchAndParse(page: puppeteer.Page, entry: SourceMapEntry): Promise<void> {
    try {
      // Resolve source map URL (could be relative or absolute)
      let sourceMapUrl = entry.sourceMapURL;
      if (!sourceMapUrl.startsWith('http') && !sourceMapUrl.startsWith('data:')) {
        const scriptUrl = new URL(entry.url);
        sourceMapUrl = new URL(sourceMapUrl, scriptUrl).toString();
      }

      let sourceMapJson: string;

      if (sourceMapUrl.startsWith('data:')) {
        // Inline source map
        const base64Match = sourceMapUrl.match(/base64,(.+)/);
        if (!base64Match) return;
        sourceMapJson = Buffer.from(base64Match[1], 'base64').toString('utf-8');
      } else {
        // Fetch from URL via page context to avoid CORS
        sourceMapJson = await page.evaluate(async (url: string) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return '';
            return await res.text();
          } catch {
            return '';
          }
        }, sourceMapUrl);
      }

      if (!sourceMapJson) return;

      const parsed = JSON.parse(sourceMapJson);
      const traceMap = new TraceMap(parsed);

      this.sourceMaps.set(entry.url, traceMap);

      // Extract source contents for text searching
      if (parsed.sourcesContent && parsed.sources) {
        const contents: { sourcePath: string; content: string }[] = [];
        for (let i = 0; i < parsed.sources.length; i++) {
          if (parsed.sourcesContent[i]) {
            contents.push({
              sourcePath: parsed.sources[i],
              content: parsed.sourcesContent[i],
            });
          }
        }
        this.sourceContents.set(entry.url, contents);
      }
    } catch (error) {
      // Skip this source map
    }
  }

  private searchSourceContents(signals: Signal[], workspaceRoot: string): SourceLocation | undefined {
    const fileScores: Map<string, { score: number; line: number; signalCount: number }> = new Map();

    for (const [, contents] of this.sourceContents) {
      for (const { sourcePath, content } of contents) {
        // Skip node_modules, vendor, etc.
        if (sourcePath.includes('node_modules') || sourcePath.includes('/vendor/')) {
          continue;
        }

        const lines = content.split('\n');

        for (const signal of signals) {
          if (!signal.text) continue;

          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(signal.text)) {
              const existing = fileScores.get(sourcePath) || { score: 0, line: i + 1, signalCount: 0 };
              existing.score += signal.weight;
              existing.signalCount++;
              // Keep the line of the highest-weight signal
              if (signal.weight > (fileScores.get(sourcePath)?.score || 0) - existing.score + signal.weight) {
                existing.line = i + 1;
              }
              fileScores.set(sourcePath, existing);
              break; // Only count first match per signal per file
            }
          }
        }
      }
    }

    if (fileScores.size === 0) return undefined;

    // Find best match
    let bestPath = '';
    let bestInfo = { score: 0, line: 1, signalCount: 0 };

    for (const [filePath, info] of fileScores) {
      // Bonus for multiple signals matching
      const adjustedScore = info.score * (1 + info.signalCount * 0.2);
      if (adjustedScore > bestInfo.score * (1 + bestInfo.signalCount * 0.2)) {
        bestPath = filePath;
        bestInfo = info;
      }
    }

    if (!bestPath) return undefined;

    // Resolve to workspace path
    const resolvedPath = this.resolveToWorkspace(bestPath, workspaceRoot);

    return {
      filePath: resolvedPath || bestPath,
      line: bestInfo.line,
      confidence: Math.min(0.95, bestInfo.score / 10),
      method: 'sourcemap',
    };
  }

  private resolveToWorkspace(sourcePath: string, workspaceRoot: string): string | undefined {
    const path = require('path');
    const fs = require('fs');

    // Source paths in source maps can be:
    // - Relative: ./src/components/Button.tsx
    // - Absolute: /Users/.../src/components/Button.tsx
    // - Webpack-style: webpack:///./src/components/Button.tsx

    let cleanPath = sourcePath
      .replace(/^webpack:\/\/\//, '')
      .replace(/^webpack:\/\/[^/]*\//, '')
      .replace(/^\.\/?/, '');

    // Try direct resolution from workspace root
    const candidate = path.resolve(workspaceRoot, cleanPath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    // Try stripping common prefixes
    const prefixes = ['src/', 'app/', 'pages/', 'components/'];
    for (const prefix of prefixes) {
      const idx = cleanPath.indexOf(prefix);
      if (idx >= 0) {
        const stripped = cleanPath.substring(idx);
        const candidate2 = path.resolve(workspaceRoot, stripped);
        if (fs.existsSync(candidate2)) {
          return candidate2;
        }
      }
    }

    return undefined;
  }
}
