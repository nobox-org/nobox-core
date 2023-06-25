import { deleteEmptyArrayNodes } from './delete-empty-array-nodes';

describe('deleteEmptyNodes', () => {
    it('should delete empty array nodes', () => {
        const input = {
            $0: [],
            $1: [1, 2, 3],
            $2: [],
            $3: [{ foo: 'bar' }],
        };
        const nodes = ['$0', '$1', '$2', '$3'];
        const expectedOutput = {
            $1: [1, 2, 3],
            $3: [{ foo: 'bar' }],
        };
        const output = deleteEmptyArrayNodes(input, nodes);
        expect(output).toEqual(expectedOutput);
    });

    it('should handle no empty array nodes', () => {
        const input = {
            $0: [1, 2, 3],
            $1: [{ foo: 'bar' }],
            $2: [4, 5],
        };
        const nodes = ['$0', '$1', '$2'];
        const expectedOutput = {
            $0: [1, 2, 3],
            $1: [{ foo: 'bar' }],
            $2: [4, 5],
        };
        const output = deleteEmptyArrayNodes(input, nodes);
        expect(output).toEqual(expectedOutput);
    });

    it('should handle unspecified nodes', () => {
        const input = {
            $0: [],
            $1: [1, 2, 3],
            $2: [],
        };
        const nodes: string[] = [];
        const expectedOutput = {
            $0: [],
            $1: [1, 2, 3],
            $2: [],
        };
        const output = deleteEmptyArrayNodes(input, nodes);
        expect(output).toEqual(expectedOutput);
    });

    it('should handle empty input object', () => {
        const input = {};
        const nodes = ['$0', '$1'];
        const expectedOutput = {};
        const output = deleteEmptyArrayNodes(input, nodes);
        expect(output).toEqual(expectedOutput);
    });
});
