/**
 * Escapes a part of a Bash command line segment for use in single quotes.
 *
 * @param str
 * @returns
 */
export function bashEscape(str: string): string {
    return str.replace(/(['";\s!"#$&()|*,<>[\]^`{}])/g, '\\$1');
}
