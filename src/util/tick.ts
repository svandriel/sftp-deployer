export function tick(): Promise<void> {
    return new Promise<void>(resolve => {
        process.nextTick(resolve);
    });
}
