import { getRecordStructureHash, GetRecordStructureHashInput } from './get-record-structure-hash';
import { CustomLoggerInstance as Logger } from '@/modules/logger/logger.service';
import { RecordFieldStructureType } from '@/types';
import * as fnvPlus from 'fnv-plus';

jest.mock('@/modules/logger/logger.service', () => ({
   CustomLoggerInstance: {
      debug: jest.fn(),
      sLog: jest.fn(),
   },
}));

jest.mock('fnv-plus', () => ({
   hash: jest.fn((input: string) => ({
      str: () => `HASH-${input}`,
   })),
}));

describe('getRecordStructureHash', () => {
   it('should return the correct hash for a given recordStructure', () => {
      const recordStructure: GetRecordStructureHashInput = {
         webhooks: {
            onInsertUrl: 'https://example.com/insert',
            onUpdateUrl: 'https://example.com/update'
         },
         description: 'Sample description',
         recordFieldStructure: [
            {
               name: 'Field 1',
               description: 'Description of Field 1',
               comment: 'Comment for Field 1',
               slug: 'field1',
               type: RecordFieldStructureType.NUMBER,
               required: true,
               unique: false,
               hashed: false,
            }
         ],
      };

      const mockLogger = Logger;

      const expectedHash = 'HASH-' + JSON.stringify(recordStructure);

      const result = getRecordStructureHash({ recordStructure, logger: mockLogger });

      expect(result).toBe(expectedHash);

      expect(fnvPlus.hash).toHaveBeenCalledWith(JSON.stringify(recordStructure), 64);
   });
});
