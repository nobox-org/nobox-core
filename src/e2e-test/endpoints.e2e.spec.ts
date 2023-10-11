import axios from 'axios';
import { baseUrl, getRandomUuids, defaultHeaders, getInferredStructure, authorizationHeaderObject, setInferredStructure } from './utils';


describe('API End-to-End Tests', () => {
  test('should get a response from /health', async () => {
    const response = await axios.get(`${baseUrl}/health`);
    expect(response.status).toBe(200);
  });

  describe('should add records via POST to /{projectSlug}/{recordSpaceSlug}', () => {
    describe("Without Authorization", () => {
      test("throws error", async () => {
        const [projectSlug, recordSpaceSlug] = getRandomUuids(3);
        const requestData = {};
        const call = () => axios.post(`${baseUrl}/${projectSlug}/${recordSpaceSlug}`, requestData, {
          headers: {
            ...defaultHeaders,
          }
        });
        await expect(() =>
          call()
        ).rejects.toThrow();
      })
    });

    describe("With Authorization", () => {

      describe("With Correct Body Payload", () => {
        test("returns correct result", async () => {
          const [projectSlug, recordSpaceSlug] = getRandomUuids(3);
          const sampleBody = {
            firstName: "dude",
            age: 22,
            male: true,
            brands: ["toyota", "puma"]
          }

          const inferredStructure = await getInferredStructure({
            projectSlug,
            recordSpaceSlug,
            sampleBody
          })

          const call = await axios.post(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/_single_`, sampleBody, {
            headers: {
              ...defaultHeaders,
              ...authorizationHeaderObject,
              structure: JSON.stringify(inferredStructure)
            }
          });
          expect(call.data.firstName).toBe(sampleBody.firstName);
          expect(call.data.age).toBe(sampleBody.age);
          expect(call.data.male).toBe(sampleBody.male);
          expect(call.data.brands[0]).toBe(sampleBody.brands[0]);
          expect(call.data.brands[1]).toBe(sampleBody.brands[1]);
        });
      })

      describe("With Incorrect Body type Payload", () => {
        test.each`
        Field Name     | Invalid Value    | Expected Type | Expected Error Message
        ${"firstName"} | ${22}            | ${"string"}   | ${"Value for Body field: 'firstName' should be a valid string"}
        ${"age"}       | ${"twenty-two"}  | ${"number"}   | ${"Value for Body field: 'age' should be a valid number"}
        ${"male"}      | ${"invalid"}     | ${"boolean"}  | ${"Value for Body field: 'male' should be a valid boolean"}
        ${"brands"}    | ${34}            | ${"array"}    | ${"Value for Body field: 'brands' should be a valid array"}
      `(
          "returns error when field is an invalid $ExpectedType",
          async ({ FieldName, InvalidValue, ExpectedType, ExpectedErrorMessage }) => {
            const [projectSlug, recordSpaceSlug] = getRandomUuids(3);
            const sampleBody = {
              firstName: "dude",
              age: 22,
              male: true,
              brands: ["toyota", "puma"]
            }

            const inferredStructure = await getInferredStructure({
              projectSlug,
              recordSpaceSlug,
              sampleBody
            });

            const call = async () => axios.post(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/_single_`, {
              ...sampleBody,
              [FieldName]: InvalidValue
            }, {
              headers: {
                ...defaultHeaders,
                ...authorizationHeaderObject,
                structure: JSON.stringify(inferredStructure)
              }
            });

            await expect(call()).rejects.toThrow();
            await expect(call()).rejects.toHaveProperty('response.data.error');
            await expect(call()).rejects.toHaveProperty('response.data.error', [ExpectedErrorMessage]);
          }
        );
      })

      describe('should add records after Setting Inferred Structure', () => {
        const [projectSlug, recordSpaceSlug] = getRandomUuids(3);
        const sampleBody = {
          name: "akintunde",
          age: 30,
          aged: true,
        };

        beforeEach(async () => {
          await setInferredStructure({
            recordSpaceSlug,
            projectSlug,
            sampleBody
          })
        })

        test('add records after setting structure', async () => {
          const addRecords = await axios.post(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/_single_`, sampleBody, {
            headers: {
              ...authorizationHeaderObject,
              'use-pre-stored-structure': true,
            }
          });
          expect(addRecords.data).toMatchObject(sampleBody);
        });

      });

    })
  });


});

