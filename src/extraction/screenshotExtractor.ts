import * as puppeteer from 'puppeteer-core';
import Jimp from 'jimp';
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
      // Get element screenshot
      const screenshotUint8 = await elementHandle.screenshot({
        type: 'png',
      });
      let finalBuffer = Buffer.from(screenshotUint8);

      // Use jimp to add padding
      if (padding > 0) {
        const image = await Jimp.read(finalBuffer);
        const imageWidth = image.getWidth();
        const imageHeight = image.getHeight();

        const paddedImage = new Jimp(imageWidth + (padding * 2), imageHeight + (padding * 2), 0xffffff1a);
        paddedImage.composite(image, padding, padding);

        finalBuffer = await paddedImage.getBufferAsync(Jimp.MIME_PNG) as any;
      }

      fs.writeFileSync(filepath, finalBuffer);

      return {
        path: filepath,
        mimeType: 'image/png',
      };
    } catch (error) {
      throw new Error(`Failed to capture element screenshot with padding: ${error}`);
    }
  }
}
