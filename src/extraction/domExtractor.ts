import * as puppeteer from 'puppeteer-core';
import { DomContext } from '../schemas';

export class DomExtractor {
  async extract(
    elementHandle: puppeteer.ElementHandle,
    contextRadius: number = 1
  ): Promise<DomContext> {
    const html = await this.getOuterHTML(elementHandle);
    const text = await this.getText(elementHandle);

    const parents: DomContext['parents'] = [];

    // Get parent HTMLs up to contextRadius levels
    for (let i = 0; i < contextRadius; i++) {
      const parentHandle = await elementHandle.evaluateHandle((el) => el.parentElement);

      if (!parentHandle || parentHandle.asElement() === null) {
        break;
      }

      try {
        const parentHtml = await this.getOuterHTML(parentHandle as puppeteer.ElementHandle);
        parents.push({
          html: parentHtml,
          level: i + 1,
        });

        // Move up the tree
        elementHandle = parentHandle as puppeteer.ElementHandle;
      } catch {
        break;
      }
    }

    return {
      element: {
        html: this.cleanHTML(html),
        text: text ? this.truncateText(text, 200) : undefined,
      },
      parents: parents.length > 0 ? parents : undefined,
    };
  }

  private async getOuterHTML(elementHandle: puppeteer.ElementHandle): Promise<string> {
    return await elementHandle.evaluate((el) => {
      // Get outer HTML but limit depth for parents
      let html = el.outerHTML;

      // Limit HTML length
      if (html.length > 2000) {
        html = html.substring(0, 2000) + '...';
      }

      return html;
    });
  }

  private async getText(elementHandle: puppeteer.ElementHandle): Promise<string> {
    return await elementHandle.evaluate((el) => {
      // Get visible text content
      const text = el.textContent?.trim() || '';
      return text;
    });
  }

  private cleanHTML(html: string): string {
    // Remove data URLs and large inline content
    html = html.replace(/data:[^,]*,[^"'\s]*/g, '[data-url]');

    // Remove inline styles that are too long
    html = html.replace(/style="[^"]{200,}"/g, 'style="[truncated]"');

    // Remove event handlers
    html = html.replace(/on\w+="[^"]*"/g, '');

    return html;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    const remaining = text.length - maxLength;
    return `${text.substring(0, maxLength)}... (+${remaining} more chars)`;
  }
}
