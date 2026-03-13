import * as puppeteer from 'puppeteer-core';
import { Styles } from '../schemas';

export class StyleExtractor {
  // Layout-critical CSS properties
  private readonly LAYOUT_PROPERTIES = [
    'display',
    'position',
    'top',
    'right',
    'bottom',
    'left',
    'width',
    'height',
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'flex-direction',
    'flex-wrap',
    'justify-content',
    'align-items',
    'align-content',
    'gap',
    'grid-template-columns',
    'grid-template-rows',
    'grid-column',
    'grid-row',
    'z-index',
    'overflow',
    'overflow-x',
    'overflow-y',
  ];

  async extract(
    elementHandle: puppeteer.ElementHandle,
    mode: 'pick' | 'full' = 'pick'
  ): Promise<Styles> {
    const computed = await this.getComputedStyles(elementHandle);
    const diff = this.calculateDiff(computed);
    const classes = await this.getClasses(elementHandle);

    return {
      computed: mode === 'full' ? computed : undefined,
      diff,
      classes,
    };
  }

  private async getComputedStyles(elementHandle: puppeteer.ElementHandle): Promise<Record<string, string>> {
    return await elementHandle.evaluate((el: Element) => {
      const styles = window.getComputedStyle(el);
      const result: Record<string, string> = {};

      // Get all computed styles
      for (let i = 0; i < styles.length; i++) {
        const prop = styles[i];
        result[prop] = styles.getPropertyValue(prop);
      }

      return result;
    });
  }

  private calculateDiff(
    computed: Record<string, string>,
  ): Record<string, string> {
    const diff: Record<string, string> = {};

    // Keep layout properties that have non-default values
    const defaults: Record<string, string> = {
      'display': 'inline',
      'position': 'static',
      'z-index': 'auto',
      'overflow': 'visible',
      'overflow-x': 'visible',
      'overflow-y': 'visible',
    };

    for (const prop of this.LAYOUT_PROPERTIES) {
      const value = computed[prop];
      if (value && value !== defaults[prop] && value !== '0px' && value !== 'normal' && value !== 'none' && value !== 'auto' && value !== 'stretch') {
        diff[prop] = value;
      }
    }

    // Also include color and font properties if explicitly set
    const colorFontProps = ['color', 'background-color', 'font-size', 'font-weight', 'text-align'];
    for (const prop of colorFontProps) {
      const value = computed[prop];
      if (value && value !== 'normal' && value !== 'start') {
        diff[prop] = value;
      }
    }

    return diff;
  }

  private async getClasses(elementHandle: puppeteer.ElementHandle): Promise<string[]> {
    return await elementHandle.evaluate((el: Element) => Array.from(el.classList) as string[]);
  }
}
