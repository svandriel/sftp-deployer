export function removeUndefineds<T extends Record<string, unknown>>(obj: T): T {
    const result: Record<string, unknown> = {};

    Object.entries(obj).map(([key, value]) => {
        if (typeof value !== 'undefined') {
            result[key] = value;
        }
    });

    return result as T;
}
