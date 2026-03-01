/**
 * YAML frontmatter parsing utility for markdown files
 */

export interface FrontmatterResult {
  frontmatter: { [key: string]: any };
  content: string;
  raw: string;
}

/**
 * Parse YAML frontmatter from markdown content
 * Supports basic key-value pairs with optional quotes
 */
export function parseFrontmatter(content: string): FrontmatterResult | null {
  const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    return null;
  }

  const [, yamlContent, markdownContent] = match;

  // Simple YAML parser (for basic key-value pairs)
  const frontmatter: { [key: string]: any } = {};
  const lines = yamlContent.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value: string | boolean | string[] = line.substring(colonIndex + 1).trim();

      // Remove quotes if present
      if (typeof value === 'string') {
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
      }

      // Handle boolean values
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      // Handle array-like values (simple comma-separated)
      else if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map((v: string) => v.trim()).filter((v: string) => v);
      }

      frontmatter[key] = value;
    }
  }

  return {
    frontmatter,
    content: markdownContent,
    raw: content,
  };
}

/**
 * Validate skill frontmatter
 */
export function validateSkillFrontmatter(frontmatter: { [key: string]: any }): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!frontmatter.name) {
    errors.push('Missing required field: name');
  }

  if (!frontmatter.description) {
    errors.push('Missing required field: description');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract metadata from a markdown file
 */
export function extractMetadata(content: string): {
  name?: string;
  description?: string;
  [key: string]: any;
} {
  const result = parseFrontmatter(content);
  if (!result) {
    return {};
  }
  return result.frontmatter;
}
