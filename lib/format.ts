/**
 * Format HN-style text content to HTML.
 * 
 * Rules:
 * - HTML entities are escaped for security
 * - *text* becomes <i>text</i>
 * - Blank lines separate paragraphs
 * - Lines indented with 2+ spaces (after blank line) become <pre><code> blocks
 * - URLs are auto-linked
 */
export function formatHnText(text: string): string {
  if (!text) return '';
  
  // Escape HTML entities first
  let escaped = escapeHtml(text);
  
  const lines = escaped.split('\n');
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isIndented = /^  /.test(line);
    const isEmpty = line.trim() === '';
    
    if (inCode) {
      if (isIndented || isEmpty) {
        codeLines.push(line);
        continue;
      } else {
        // End code block - trim trailing empty lines
        while (codeLines.length > 0 && codeLines[codeLines.length - 1].trim() === '') {
          codeLines.pop();
        }
        blocks.push('<pre><code>' + codeLines.join('\n') + '</code></pre>');
        codeLines = [];
        inCode = false;
      }
    }
    
    if (isEmpty) {
      if (currentBlock.length > 0) {
        blocks.push(formatParagraph(currentBlock.join(' ')));
        currentBlock = [];
      }
      // Check if next line starts a code block
      if (i + 1 < lines.length && /^  /.test(lines[i + 1])) {
        inCode = true;
      }
      continue;
    }
    
    if (isIndented && currentBlock.length === 0 && (i === 0 || lines[i - 1].trim() === '')) {
      inCode = true;
      codeLines.push(line);
      continue;
    }
    
    currentBlock.push(line);
  }
  
  // Flush remaining
  if (inCode && codeLines.length > 0) {
    while (codeLines.length > 0 && codeLines[codeLines.length - 1].trim() === '') {
      codeLines.pop();
    }
    blocks.push('<pre><code>' + codeLines.join('\n') + '</code></pre>');
  }
  
  if (currentBlock.length > 0) {
    blocks.push(formatParagraph(currentBlock.join(' ')));
  }
  
  return blocks.join('\n');
}

function formatParagraph(text: string): string {
  // Apply italic formatting: *text* → <i>text</i>
  text = text.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  
  // Auto-link URLs
  text = autoLinkUrls(text);
  
  return '<p>' + text + '</p>';
}

function autoLinkUrls(text: string): string {
  // Match URLs that aren't already inside HTML tags
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  return text.replace(urlRegex, '<a href="$1" rel="nofollow">$1</a>');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
