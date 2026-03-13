import { MaxContext } from '../schemas';

export class Redactor {
  private readonly MAX_TEXT_LENGTH = 500;
  private readonly MAX_HTML_LENGTH = 1500;

  redact(context: MaxContext): MaxContext {
    const redacted = JSON.parse(JSON.stringify(context)) as MaxContext;

    // Track what was redacted
    const redaction = {
      truncatedFields: [] as string[],
      removed: [] as string[],
    };

    // Redact DOM text content
    if (redacted.dom.element.text) {
      if (redacted.dom.element.text.length > this.MAX_TEXT_LENGTH) {
        redacted.dom.element.text = this.truncateText(redacted.dom.element.text);
        redaction.truncatedFields.push('dom.element.text');
      }
    }

    // Redact parent HTML
    if (redacted.dom.parents) {
      redacted.dom.parents = redacted.dom.parents.map((parent) => ({
        ...parent,
        html: this.redactHtml(parent.html),
      }));
    }

    // Redact element HTML
    redacted.dom.element.html = this.redactHtml(redacted.dom.element.html);

    // Redact identity text
    if (redacted.identity.text && redacted.identity.text.length > this.MAX_TEXT_LENGTH) {
      redacted.identity.text = this.truncateText(redacted.identity.text);
      redaction.truncatedFields.push('identity.text');
    }

    // Remove sensitive data attributes
    if (redacted.identity.dataAttributes) {
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /token/i,
        /api[_-]?key/i,
        /auth/i,
      ];

      Object.keys(redacted.identity.dataAttributes).forEach((key) => {
        if (sensitivePatterns.some((pattern) => pattern.test(key))) {
          delete redacted.identity.dataAttributes![key];
          redaction.removed.push(`dataAttributes.${key}`);
        }
      });
    }

    redacted.redaction = redaction;
    return redacted;
  }

  private redactHtml(html: string): string {
    // Remove data URLs
    html = html.replace(/data:[^,]*,[^"'\s]*/g, '[data-url]');

    // Truncate large style attributes
    html = html.replace(/style="[^"]{200,}"/g, 'style="[truncated]"');

    // Remove event handlers
    html = html.replace(/on\w+="[^"]*"/g, '');

    // Truncate if too long
    if (html.length > this.MAX_HTML_LENGTH) {
      html = html.substring(0, this.MAX_HTML_LENGTH) + '...</html>';
    }

    return html;
  }

  private truncateText(text: string): string {
    if (text.length <= this.MAX_TEXT_LENGTH) {
      return text;
    }

    const remaining = text.length - this.MAX_TEXT_LENGTH;
    return `${text.substring(0, this.MAX_TEXT_LENGTH)}...(+${remaining} more chars)`;
  }
}
