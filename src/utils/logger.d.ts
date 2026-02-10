/**
 * Type declarations for logger module
 */

declare module 'ora' {
  interface Ora {
    start(): Ora;
    stop(): Ora;
    succeed(text?: string): Ora;
    fail(text?: string): Ora;
    warn(text?: string): Ora;
    info(text?: string): Ora;
    stopAndPersist(options?: { text?: string; symbol: string }): Ora;
    clear(): Ora;
    frame(): string;
  }

  function ora(options: string | { text: string; color?: string }): Ora;
  export = ora;
}
