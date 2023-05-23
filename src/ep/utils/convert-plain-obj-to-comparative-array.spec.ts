import { convertPlainObjectToComparativeArray } from './convert-plain-obj-to-comparative-array';

describe('convertPlainObjectiveToComparativeArray', () => {
    it('should convert object properties to an array of comparative objects', () => {
        const input = { firstName: 'Admin', lastName: 'User' };
        const node = '$or';
        const expectedOutput = {
            $or: [
                { firstName: 'Admin' },
                { lastName: 'User' },
            ],
        };
        const output = convertPlainObjectToComparativeArray(input, node);
        expect(output).toEqual(expectedOutput);
    });

    it('should handle empty input object', () => {
        const input = {};
        const node = '$and';
        const expectedOutput = {
            $and: [],
        };
        const output = convertPlainObjectToComparativeArray(input, node);
        expect(output).toEqual(expectedOutput);
    });

    it('should handle input object with multiple properties', () => {
        const input = { age: 30, location: 'New York', sex: 'male' };
        const node = '$any';
        const expectedOutput = {
            $any: [
                { age: 30 },
                { location: 'New York' },
                { sex: 'male' }
            ],
        };
        const output = convertPlainObjectToComparativeArray(input, node);
        expect(output).toEqual(expectedOutput);
    });
});
