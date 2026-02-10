/**
 * Logging utility with colors and formatting
 */

import chalk from 'chalk';
import ora from 'ora';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4,
}

let currentLevel: LogLevel = LogLevel.INFO;

/**
 * Set the current log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

/**
 * Log a debug message
 */
export function debug(message: string, ...args: unknown[]): void {
  if (currentLevel <= LogLevel.DEBUG) {
    console.log(chalk.gray('[DEBUG]'), message, ...args);
  }
}

/**
 * Log an info message
 */
export function info(message: string, ...args: unknown[]): void {
  if (currentLevel <= LogLevel.INFO) {
    console.log(chalk.blue('[INFO]'), message, ...args);
  }
}

/**
 * Log a warning message
 */
export function warn(message: string, ...args: unknown[]): void {
  if (currentLevel <= LogLevel.WARN) {
    console.log(chalk.yellow('[WARN]'), message, ...args);
  }
}

/**
 * Log an error message
 */
export function error(message: string, ...args: unknown[]): void {
  if (currentLevel <= LogLevel.ERROR) {
    console.error(chalk.red('[ERROR]'), message, ...args);
  }
}

/**
 * Log a success message
 */
export function success(message: string, ...args: unknown[]): void {
  if (currentLevel <= LogLevel.SUCCESS) {
    console.log(chalk.green('[✓]'), message, ...args);
  }
}

/**
 * Log a header/section title
 */
export function header(title: string): void {
  console.log();
  console.log(chalk.bold.cyan(`\n═══ ${title} ═══`));
  console.log();
}

/**
 * Log a subheader
 */
export function subheader(title: string): void {
  console.log(chalk.bold.white(`\n── ${title}`));
}

/**
 * Print a key-value pair
 */
export function kv(key: string, value: string): void {
  console.log(`${chalk.gray(key)}: ${chalk.white(value)}`);
}

/**
 * Print a list item
 */
export function item(text: string, checked = false): void {
  const icon = checked ? chalk.green('☑') : chalk.white('☐');
  console.log(`  ${icon} ${text}`);
}

/**
 * Print a bullet point
 */
export function bullet(text: string): void {
  console.log(`  ${chalk.cyan('•')} ${text}`);
}

/**
 * Print a separator line
 */
export function separator(): void {
  console.log(chalk.gray('─'.repeat(50)));
}

/**
 * Create a progress spinner (requires ora)
 */
export function spinner(text: string) {
  return ora({
    text,
    color: 'cyan',
  });
}

/**
 * Print a table
 */
export function table(headers: string[], rows: string[][]): void {
  const columnWidths = headers.map((h, i) => {
    const maxRowWidth = Math.max(...rows.map(r => (r[i] || '').length));
    return Math.max(h.length, maxRowWidth);
  });

  // Print header
  const headerRow = headers.map((h, i) => h.padEnd(columnWidths[i])).join(' | ');
  console.log(chalk.bold(headerRow));

  // Print separator
  const separator = columnWidths.map(w => '─'.repeat(w)).join('-+-');
  console.log(chalk.gray(separator));

  // Print rows
  for (const row of rows) {
    const formattedRow = headers.map((_, i) => (row[i] || '').padEnd(columnWidths[i])).join(' | ');
    console.log(formattedRow);
  }
}

/**
 * Print file status
 */
export function fileStatus(path: string, status: string): void {
  let statusColor = chalk.white;
  let statusIcon = ' ';

  switch (status) {
    case 'added':
      statusColor = chalk.green;
      statusIcon = '+';
      break;
    case 'modified':
      statusColor = chalk.yellow;
      statusIcon = '~';
      break;
    case 'deleted':
      statusColor = chalk.red;
      statusIcon = '-';
      break;
    case 'conflict':
      statusColor = chalk.red;
      statusIcon = '!';
      break;
  }

  console.log(`  ${statusColor(statusIcon)} ${chalk.gray(path)}`);
}

/**
 * Clear the console
 */
export function clear(): void {
  console.clear();
}

/**
 * Print a blank line
 */
export function newline(): void {
  console.log();
}
