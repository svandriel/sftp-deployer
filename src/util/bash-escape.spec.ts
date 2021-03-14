import { bashEscape } from './bash-escape';

describe('bashEscape', () => {
    const dangerousChars = charArray('\'";!"#$&()|*,<>[]^`{}');

    dangerousChars.forEach(ch => {
        it(`escapes the character '${ch}'`, () => {
            const input = `Testing${ch}OneTwo`;
            const expectedOutput = `Testing\\${ch}OneTwo`;
            expect(bashEscape(input)).toBe(expectedOutput);
        });

        it('escapes from hell', () => {
            expect(bashEscape('And then I\'d have to say: "Ah!"')).toBe(
                'And\\ then\\ I\\\'d\\ have\\ to\\ say:\\ \\"Ah\\!\\"'
            );
        });
    });
});

function charArray(str: string): string[] {
    const arr: string[] = [];
    for (let i = 0; i < str.length; i++) {
        arr.push(str.charAt(i));
    }
    return arr;
}
