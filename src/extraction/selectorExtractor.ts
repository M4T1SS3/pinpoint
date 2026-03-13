import * as puppeteer from 'puppeteer-core';
import { Selector } from '../schemas';

export class SelectorExtractor {
  async extract(elementHandle: puppeteer.ElementHandle): Promise<{ primary: Selector; alternates?: Selector[] }> {
    const selectors: Selector[] = [];

    // 1. Try data-testid, data-test, data-qa
    const dataAttrSelector = await this.tryDataAttributes(elementHandle);
    if (dataAttrSelector) {
      selectors.push(dataAttrSelector);
    }

    // 2. Try stable ID
    const idSelector = await this.tryStableId(elementHandle);
    if (idSelector) {
      selectors.push(idSelector);
    }

    // 3. Try role + aria-label combo
    const roleAriaSelector = await this.tryRoleAriaLabel(elementHandle);
    if (roleAriaSelector) {
      selectors.push(roleAriaSelector);
    }

    // 4. Try stable class combo
    const classSelector = await this.tryStableClassCombo(elementHandle);
    if (classSelector) {
      selectors.push(classSelector);
    }

    // 5. Fallback: position-based with parent context
    const positionSelector = await this.tryPositionBased(elementHandle);
    if (positionSelector) {
      selectors.push(positionSelector);
    }

    // Return primary (highest confidence) and alternates
    if (selectors.length === 0) {
      // Last resort: css path
      const cssPath = await this.getCssPath(elementHandle);
      selectors.push({
        selector: cssPath,
        confidence: 0.3,
        method: 'position',
      });
    }

    const sorted = selectors.sort((a, b) => b.confidence - a.confidence);
    return {
      primary: sorted[0],
      alternates: sorted.slice(1),
    };
  }

  private async tryDataAttributes(elementHandle: puppeteer.ElementHandle): Promise<Selector | null> {
    const dataAttrs = ['data-testid', 'data-test', 'data-qa'];

    for (const attr of dataAttrs) {
      const value = await elementHandle.evaluate(
        (el: Element, attrName: string) => el.getAttribute(attrName),
        attr
      );

      if (value) {
        const selector = `[${attr}="${value}"]`;
        return {
          selector,
          confidence: 0.95,
          method: 'data-attr',
        };
      }
    }

    return null;
  }

  private async tryStableId(elementHandle: puppeteer.ElementHandle): Promise<Selector | null> {
    const id = await elementHandle.evaluate((el) => el.id);

    if (!id) {
      return null;
    }

    // Check if ID looks like a UUID or random hash
    if (this.isUnstableId(id)) {
      return null;
    }

    const selector = `#${id}`;
    return {
      selector,
      confidence: 0.9,
      method: 'id',
    };
  }

  private isUnstableId(id: string): boolean {
    // Detect UUID patterns (8-4-4-4-12 hex)
    if (/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(id)) {
      return true;
    }

    // Detect long random hex strings
    if (/^[0-9a-f]{20,}$/i.test(id)) {
      return true;
    }

    // Detect base64-like strings
    if (/^[A-Za-z0-9+/]{20,}={0,2}$/.test(id)) {
      return true;
    }

    return false;
  }

  private async tryRoleAriaLabel(elementHandle: puppeteer.ElementHandle): Promise<Selector | null> {
    const { role, ariaLabel } = await elementHandle.evaluate((el) => ({
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label'),
    }));

    if (!role || !ariaLabel) {
      return null;
    }

    const selector = `[role="${role}"][aria-label="${ariaLabel}"]`;
    return {
      selector,
      confidence: 0.85,
      method: 'role-label',
    };
  }

  private async tryStableClassCombo(elementHandle: puppeteer.ElementHandle): Promise<Selector | null> {
    const classes = await elementHandle.evaluate((el: Element) => {
      const utilityPatterns = [
        /^(m|p|w|h|flex|grid|text|bg|border|rounded|shadow|opacity|transform)/,
        /^(mt|mr|mb|ml|px|py|pt|pb|pl|pr)\d+/,
        /^(absolute|relative|fixed|static)/,
        /^(block|inline|hidden)/,
      ];

      return Array.from(el.classList)
        .filter((cls: string) => !utilityPatterns.some((pattern) => pattern.test(cls)))
        .slice(0, 3) as string[];
    });

    if (classes.length === 0) {
      return null;
    }

    const selector = classes.length === 1
      ? `.${classes[0]}`
      : classes.map((cls: string) => `.${cls}`).join('');

    return {
      selector,
      confidence: 0.7,
      method: 'class-combo',
    };
  }

  private async tryPositionBased(elementHandle: puppeteer.ElementHandle): Promise<Selector | null> {
    try {
      const cssPath = await this.getCssPath(elementHandle);
      return {
        selector: cssPath,
        confidence: 0.5,
        method: 'position',
      };
    } catch {
      return null;
    }
  }

  private async getCssPath(elementHandle: puppeteer.ElementHandle): Promise<string> {
    return await elementHandle.evaluate((el: Element) => {
      const paths: string[] = [];
      let current: Element | null = el;

      while (current && current !== (document.body as Element)) {
        let selector = current.tagName.toLowerCase();

        if (current.id) {
          selector += `#${current.id}`;
          paths.unshift(selector);
          break;
        }

        const siblings = Array.from(current.parentNode?.childNodes || [])
          .filter((n): n is Element => n.nodeType === 1);
        const sameTagSiblings = siblings.filter(
          (s) => s.tagName.toLowerCase() === current!.tagName.toLowerCase()
        );

        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(current as Element) + 1;
          selector += `:nth-of-type(${index})`;
        }

        paths.unshift(selector);
        current = current.parentElement;
      }

      return paths.join(' > ');
    });
  }
}
