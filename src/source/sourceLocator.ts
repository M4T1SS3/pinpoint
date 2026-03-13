import * as puppeteer from 'puppeteer-core';
import { Identity, DomContext, SourceLocation } from '../schemas';
import { SourceMapResolver } from './sourceMapResolver';
import { WorkspaceGrep } from './workspaceGrep';

export class SourceLocator {
  private sourceMapResolver = new SourceMapResolver();
  private workspaceGrep = new WorkspaceGrep();

  async locate(
    page: puppeteer.Page,
    identity: Identity,
    dom: DomContext,
    workspaceRoot: string
  ): Promise<SourceLocation | undefined> {
    // Build signals from identity/dom for both strategies
    const signals = this.workspaceGrep.buildSignals(identity, dom);

    if (signals.length === 0) return undefined;

    // Strategy 1: Source maps (most accurate)
    try {
      const sourceMapResult = await this.sourceMapResolver.resolve(page, signals, workspaceRoot);
      if (sourceMapResult && sourceMapResult.confidence >= 0.3) {
        return sourceMapResult;
      }
    } catch (error) {
      console.warn('Source map resolution failed, falling back to grep:', error);
    }

    // Strategy 2: Workspace grep (fallback)
    try {
      return await this.workspaceGrep.search(identity, dom);
    } catch (error) {
      console.warn('Workspace grep failed:', error);
      return undefined;
    }
  }
}
