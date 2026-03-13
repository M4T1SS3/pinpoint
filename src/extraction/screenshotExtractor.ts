import * as puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { Screenshot } from '../schemas';

export class ScreenshotExtractor {
  async extract(
    elementHandle: puppeteer.ElementHandle,
    tempDir: string
  ): Promise<Screenshot> {
    const timestamp = Date.now();
    const filename = `element-${timestamp}.png`;
    const filepath = path.join(tempDir, filename);

    try {
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Take element screenshot using Puppeteer
      const screenshotBuffer = await elementHandle.screenshot({
        type: 'png',
      });

      // Save to file
      fs.writeFileSync(filepath, screenshotBuffer);

      // Return screenshot object with path
      return {
        path: filepath,
        mimeType: 'image/png',
      };
    } catch (error) {
      throw new Error(`Failed to capture element screenshot: ${error}`);
    }
  }

  async extractWithPadding(
    elementHandle: puppeteer.ElementHandle,
    tempDir: string,
    padding: number = 16
  ): Promise<Screenshot> {
    const timestamp = Date.now();
    const filename = `element-${timestamp}.png`;
    const filepath = path.join(tempDir, filename);

    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Get element screenshot
      let screenshotBuffer = await elementHandle.screenshot({
        type: 'png',
      });

      // Use sharp to add padding
      if (padding > 0) {
        const metadata = await sharp(screenshotBuffer).metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;

        screenshotBuffer = await sharp(screenshotBuffer)
          .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 255, g: 255, b: 255, alpha: 0.1 },
          })
          .toBuffer();
      }

      fs.writeFileSync(filepath, screenshotBuffer);

      return {
        path: filepath,
        mimeType: 'image/png',
      };
    } catch (error) {
      throw new Error(`Failed to capture element screenshot with padding: ${error}`);
    }
  }
}
