/**
 * Package-root host entry.
 *
 * DSH discovers a package's browser half (`dsh.client` + `./client`) only when
 * an active Loader row names the **exact package root** (`@local/dsh-chat-mode`).
 * The settings and preset rows are package subpaths, so they cannot trigger that
 * scan. This no-op root plugin exists solely to give the client module a mount
 * point; it registers no service, no tool, and no command.
 */
export function apply() {}
