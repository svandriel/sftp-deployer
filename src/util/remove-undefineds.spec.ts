import { removeUndefineds } from './remove-undefineds';

describe('remove undefineds', () => {
    it('works', () => {
        const obj = {
            a: 1,
            b: undefined,
            c: {
                d: 'one',
                e: undefined
            },
            d: false,
            e: ''
        };
        const objKeys = Object.keys(obj);
        expect(objKeys.length).toBe(5);
        expect(objKeys).toEqual(['a', 'b', 'c', 'd', 'e']);

        const result = removeUndefineds(obj);
        const resultKeys = Object.keys(result);
        expect(resultKeys.length).toBe(4);
        expect(resultKeys).toEqual(['a', 'c', 'd', 'e']);

        expect(result).toEqual({
            a: 1,
            c: {
                d: 'one',
                e: undefined
            },
            d: false,
            e: ''
        });
    });
});
