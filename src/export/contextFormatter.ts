import * as path from 'path';
import { MaxContext, CaptureMode } from '../schemas';

export class ContextFormatter {
  formatForChat(
    captures: MaxContext[],
    mode: CaptureMode,
    workspaceRoot: string
  ): string {
    if (captures.length === 1) {
      return this.formatSingleElement(captures[0], mode, workspaceRoot);
    } else {
      return this.formatMultipleElements(captures, mode, workspaceRoot);
    }
  }

  private formatSingleElement(
    context: MaxContext,
    mode: CaptureMode,
    workspaceRoot: string
  ): string {
    let text = `## UI Element Context\n\n`;

    // Selector
    text += `### Selected Element\n`;
    text += `**Selector:** \`${context.selectors.primary.selector}\`\n`;
    if (context.identity.role) {
      text += `**Role:** ${context.identity.role}\n`;
    }
    if (context.identity.text) {
      text += `**Text:** ${this.escapeMarkdown(context.identity.text)}\n`;
    }
    text += `\n`;

    // Component name
    const componentName = context.reactComponent
      || (context.sourceLocation && this.extractComponentName(context.sourceLocation.filePath));
    if (componentName) {
      text += `**Component:** \`${componentName}\`\n`;
    }

    // DOM
    text += `### Element Structure\n`;
    text += `\`\`\`html\n`;
    text += `${context.dom.element.html}\n`;
    text += `\`\`\`\n\n`;

    // Layout
    text += `### Layout\n`;
    text += `- **Position:** top: ${context.layout.bbox.top}px, left: ${context.layout.bbox.left}px\n`;
    text += `- **Size:** ${context.layout.bbox.width}px × ${context.layout.bbox.height}px\n`;
    text += `- **Viewport:** ${context.layout.viewport?.width}px × ${context.layout.viewport?.height}px\n`;
    text += `\n`;

    // Styles
    if (context.styles.diff && Object.keys(context.styles.diff).length > 0) {
      text += `### Key Styles\n`;
      Object.entries(context.styles.diff).forEach(([prop, value]) => {
        text += `- **${prop}:** \`${value}\`\n`;
      });
      text += `\n`;
    }

    // Source file if detected
    if (context.sourceLocation) {
      const relPath = path.relative(workspaceRoot, context.sourceLocation.filePath);
      text += `### Source File\n`;
      text += `**File:** \`${relPath}\``;
      if (context.sourceLocation.line) {
        text += ` (line ${context.sourceLocation.line})`;
      }
      text += `\n`;
    }

    // Screenshot only in full mode
    if (mode === 'full' && context.visual?.path) {
      const relPath = path.relative(workspaceRoot, context.visual.path);
      text += `### Screenshot\n`;
      text += `@${relPath}\n\n`;
    }

    // Footer for user to add instruction
    text += `---\n`;

    return text;
  }

  private formatMultipleElements(
    contexts: MaxContext[],
    mode: CaptureMode,
    workspaceRoot: string
  ): string {
    let text = `## UI Element Comparison\n\n`;
    text += `**Elements:** ${contexts.length}\n\n`;

    contexts.forEach((context, index) => {
      text += `### Element ${index + 1}\n`;
      text += `**Selector:** \`${context.selectors.primary.selector}\`\n`;

      if (context.identity.text) {
        text += `**Text:** ${this.escapeMarkdown(context.identity.text)}\n`;
      }

      // Component name
      const componentName = context.reactComponent
        || (context.sourceLocation && this.extractComponentName(context.sourceLocation.filePath));
      if (componentName) {
        text += `**Component:** \`${componentName}\`\n`;
      }

      text += `**Structure:**\n`;
      text += `\`\`\`html\n`;
      text += `${context.dom.element.html}\n`;
      text += `\`\`\`\n\n`;

      // Screenshot only in full mode
      if (mode === 'full' && context.visual?.path) {
        const relPath = path.relative(workspaceRoot, context.visual.path);
        text += `**Screenshot:** @${relPath}\n\n`;
      }

      text += `---\n\n`;
    });

    return text;
  }

  private extractComponentName(filePath: string): string | undefined {
    const basename = path.basename(filePath, path.extname(filePath));
    // Skip index files - not useful as component names
    if (basename === 'index') return undefined;
    // Return PascalCase names (likely React components) or any meaningful name
    return basename;
  }

  private escapeMarkdown(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');
  }
}
