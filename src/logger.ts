/**
 * Logger interface accepted by the server and the client (injected via constructor options).
 *
 * Shape matches popular Node loggers (pino, winston, bunyan): a level method that takes a message
 * string plus optional structured metadata. Implementations may interpret `meta` however they like.
 *
 * If no logger is injected, the library uses a default that writes `warn` / `error` to `console`
 * and discards `debug` / `info` (so production output stays quiet).
 */
export interface Logger {
    debug(message: string, ...meta: unknown[]): void;
    info(message: string, ...meta: unknown[]): void;
    warn(message: string, ...meta: unknown[]): void;
    error(message: string, ...meta: unknown[]): void;
}
