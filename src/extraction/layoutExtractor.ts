import * as puppeteer from 'puppeteer-core';
import { Layout, BoundingBox } from '../schemas';

export class LayoutExtractor {
  async extract(
    elementHandle: puppeteer.ElementHandle,
    page: puppeteer.Page
  ): Promise<Layout> {
    const bbox = await this.getBoundingBox(elementHandle);
    const parentBbox = await this.getParentBoundingBox(elementHandle);
    const scroll = await this.getScrollOffset(page);
    const viewport = await this.getViewport(page);
    const dpr = await this.getDevicePixelRatio(page);

    return {
      bbox,
      parentBbox: parentBbox || undefined,
      scrollOffset: scroll,
      viewport,
      devicePixelRatio: dpr,
    };
  }

  private async getBoundingBox(elementHandle: puppeteer.ElementHandle): Promise<BoundingBox> {
    const box = await elementHandle.boundingBox();

    if (!box) {
      throw new Error('Element is not visible or has no bounding box');
    }

    return {
      top: Math.round(box.y),
      left: Math.round(box.x),
      width: Math.round(box.width),
      height: Math.round(box.height),
      right: Math.round(box.x + box.width),
      bottom: Math.round(box.y + box.height),
    };
  }

  private async getParentBoundingBox(elementHandle: puppeteer.ElementHandle): Promise<BoundingBox | null> {
    try {
      const parentBox = await elementHandle.evaluate((el) => {
        const parent = el.parentElement;
        if (!parent) {
          return null;
        }

        const rect = parent.getBoundingClientRect();
        return {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
        };
      });

      if (!parentBox) {
        return null;
      }

      return {
        top: Math.round(parentBox.top),
        left: Math.round(parentBox.left),
        width: Math.round(parentBox.width),
        height: Math.round(parentBox.height),
        right: Math.round(parentBox.right),
        bottom: Math.round(parentBox.bottom),
      };
    } catch {
      return null;
    }
  }

  private async getScrollOffset(page: puppeteer.Page): Promise<{ x: number; y: number } | undefined> {
    try {
      const offset = await page.evaluate(() => ({
        x: window.scrollX,
        y: window.scrollY,
      }));

      return {
        x: Math.round(offset.x),
        y: Math.round(offset.y),
      };
    } catch {
      return undefined;
    }
  }

  private async getViewport(page: puppeteer.Page): Promise<{ width: number; height: number } | undefined> {
    try {
      const viewport = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }));

      return {
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
      };
    } catch {
      return undefined;
    }
  }

  private async getDevicePixelRatio(page: puppeteer.Page): Promise<number> {
    try {
      const dpr = await page.evaluate(() => window.devicePixelRatio);
      return dpr || 1;
    } catch {
      return 1;
    }
  }
}
