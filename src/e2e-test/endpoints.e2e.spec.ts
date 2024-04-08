import axios from 'axios';
import { baseUrl, getRandomUuids, defaultHeaders, getInferredStructure, authorizationHeaderObject, setInferredStructure, headersWithAuthorization, addRecords, addRecordsWithPrestoredStructure } from './utils';


describe('API End-to-End Tests', () => {
  test('should get a response from /health', async () => {
    const response = await axios.get(`${baseUrl}/health`);
    expect(response.status).toBe(200);
  });

  describe('should add a single record via POST', () => {
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
            age: 9000,
            male: true,
            brands: ["toyota", "puma"],
            address: {
              city: "Akure",
              state: "Ondo",
              country: "Nigeria",
            },
            cars: [{ model: "toyota", year: 2020 }, { model: "puma", year: 2022 }],
          }

          const inferredStructure = await getInferredStructure({
            projectSlug,
            recordSpaceSlug,
            sampleBody
          })

          console.log(JSON.stringify(inferredStructure, null, 2));

          const call = await axios.post(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/_single_`, sampleBody, {
            headers: {
              ...defaultHeaders,
              ...authorizationHeaderObject,
              structure: JSON.stringify(inferredStructure)
            }
          });

          console.log({ headers: call.headers['request-id'] })
          console.log({ data: call.data });

          expect(call.data.firstName).toBe(sampleBody.firstName);
          expect(call.data.age).toBe(sampleBody.age);
          expect(call.data.male).toBe(sampleBody.male);
          expect(call.data.brands[0]).toBe(sampleBody.brands[0]);
          expect(call.data.brands[1]).toBe(sampleBody.brands[1]);
          expect(call.data.address).toEqual(sampleBody.address);
          expect(call.data.cars[0].model).toBe(sampleBody.cars[0].model);
        });
      })

      describe("With Incorrect Body type Payload", () => {
        test.each`
        Field Name     | Invalid Value    | Expected Type | Expected Error Message
        ${"firstName"} | ${22}            | ${"string"}   | ${"Value for Body field: 'firstName' should be a valid string"}
        ${"age"}       | ${"twenty-two"}  | ${"number"}   | ${"Value for Body field: 'age' should be a valid number"}
        ${"male"}      | ${"invalid"}     | ${"boolean"}  | ${"Value for Body field: 'male' should be a valid boolean"}
        ${"brands"}    | ${34}            | ${"array"}    | ${"Value for Body field: 'brands' should be a valid array"}
        ${"address"}   | ${"invalid"}     | ${"object"}   | ${"Value for Body field: 'address' should be a valid object"}
        ${"cars"}      | ${"invalid"}     | ${"array"}    | ${"Value for Body field: 'cars' should be a valid array"}
      `(
          "returns error when field is an invalid $ExpectedType",
          async ({ FieldName, InvalidValue, ExpectedType, ExpectedErrorMessage }) => {
            const [projectSlug, recordSpaceSlug] = getRandomUuids(3);
            const sampleBody = {
              firstName: "dude",
              age: 22,
              male: true,
              brands: ["toyota", "puma"],
              address: {
                city: "Akure",
                state: "Ondo",
                country: "Nigeria",
              },
              cars: [{ model: "toyota", year: 2020 }, { model: "puma", year: 2022 }],
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

            console.log({
              ...sampleBody,
              [FieldName]: InvalidValue
            })

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
          brands: ["toyota", "puma"],
          address: {
            city: "Akure",
            state: "Ondo",
            country: "Nigeria",
          }
        };

        beforeEach(async () => {
          await setInferredStructure({
            recordSpaceSlug,
            projectSlug,
            sampleBody
          })
        })

        test('add records after setting structure', async () => {
          const call = async () => await axios.post(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/_single_`, sampleBody, {
            headers: {
              ...authorizationHeaderObject,
              'use-pre-stored-structure': 'true',
            }
          });
          await expect((await call()).data).toMatchObject(sampleBody);

        });

        test('throws error when use-pre-stored-structure is false', async () => {
          const call = async () => await axios.post(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/_single_`, sampleBody, {
            headers: {
              ...headersWithAuthorization,
              'use-pre-stored-structure': 'false',
            }
          });
          await expect(call()).rejects.toHaveProperty('response.data.error', ["Please set structure in Request Header"]);
        });

        test('throws error when use-pre-stored-structure is not set', async () => {
          const call = async () => await axios.post(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/_single_`, sampleBody, {
            headers: {
              ...headersWithAuthorization
            }
          });
          await expect(call()).rejects.toHaveProperty('response.data.error', ["Please set structure in Request Header"]);
        });

      });

    })
  });


  describe('should get records via GET', () => {
    describe("Without Authorization", () => {
      test("throws error", async () => {
        const [projectSlug, recordSpaceSlug] = getRandomUuids(3);
        const call = () => axios.get(`${baseUrl}/${projectSlug}/${recordSpaceSlug}`, {
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
            brands: ["toyota", "puma"],
            address: {
              city: "Akure",
              state: "Ondo",
              country: "Nigeria",
            }
          }

          const inferredStructure = await getInferredStructure({
            projectSlug,
            recordSpaceSlug,
            sampleBody
          })

          await addRecords({
            projectSlug,
            recordSpaceSlug,
            inferredStructure,
            body: [sampleBody]
          })


          const call = async () => axios.get(`${baseUrl}/${projectSlug}/${recordSpaceSlug}`, {
            headers: {
              ...defaultHeaders,
              ...authorizationHeaderObject,
              structure: JSON.stringify(inferredStructure)
            }
          });

          expect((await call()).data).toMatchObject([sampleBody]);
        });
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

          await addRecordsWithPrestoredStructure({
            projectSlug,
            recordSpaceSlug,
            body: [sampleBody]
          })
        })

        test('get records after setting structure', async () => {
          const call = async () => await axios.get(`${baseUrl}/${projectSlug}/${recordSpaceSlug}`, {
            headers: {
              ...authorizationHeaderObject,
              'use-pre-stored-structure': 'true',
            }
          });
          expect((await call()).data).toMatchObject([sampleBody]);
        });

        test('throws error when use-pre-stored-structure is false', async () => {
          const call = async () => await axios.get(`${baseUrl}/${projectSlug}/${recordSpaceSlug}`, {
            headers: {
              ...headersWithAuthorization,
              'use-pre-stored-structure': 'false',
            }
          });
          await expect(call()).rejects.toHaveProperty('response.data.error', ["Please set structure in Request Header"]);
        });

        test('throws error when use-pre-stored-structure is not set', async () => {
          const call = async () => await axios.get(`${baseUrl}/${projectSlug}/${recordSpaceSlug}`, {
            headers: {
              ...headersWithAuthorization
            }
          });
          await expect(call()).rejects.toHaveProperty('response.data.error', ["Please set structure in Request Header"]);
        });

      });

    })
  });


  describe('should get record via GET', () => {
    describe("Without Authorization", () => {
      test("throws error", async () => {
        const [projectSlug, recordSpaceSlug] = getRandomUuids(3);
        const call = () => axios.get(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/_single_`, {
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
            brands: ["toyota", "puma"],
            address: {
              city: "Akure",
              state: "Ondo",
              country: "Nigeria",
            }
          }

          const inferredStructure = await getInferredStructure({
            projectSlug,
            recordSpaceSlug,
            sampleBody
          })

          await addRecords({
            projectSlug,
            recordSpaceSlug,
            inferredStructure,
            body: [sampleBody]
          });


          const call = async () => axios.get(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/_single_`, {
            headers: {
              ...defaultHeaders,
              ...authorizationHeaderObject,
              structure: JSON.stringify(inferredStructure)
            }
          });

          expect((await call()).data).toMatchObject(sampleBody);
        });
      })

      describe('should get records after Setting Inferred Structure', () => {
        const [projectSlug, recordSpaceSlug] = getRandomUuids(3);

        const sampleBody = {
          name: "akintunde",
          age: 30,
          aged: true,
          married: false,
          address: {
            city: "lagos",
            state: "lagos",
            country: "nigeria",
          },
          citiesIHaveLived: [
            "lagos",
            "abuja",
          ],
          otherAddresses: [{
            city: "lagos",
            state: "lagos",
            country: "nigeria",
          }]
        };

        beforeEach(async () => {
          await setInferredStructure({
            recordSpaceSlug,
            projectSlug,
            sampleBody,
          })

          await addRecordsWithPrestoredStructure({
            projectSlug,
            recordSpaceSlug,
            body: [sampleBody]
          })
        })

        test('get records after setting structure', async () => {
          const call = async () => await axios.get(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/_single_`, {
            headers: {
              ...authorizationHeaderObject,
              'use-pre-stored-structure': 'true',
            }
          });
          expect((await call()).data).toMatchObject(sampleBody);
        });

        test('throws error when use-pre-stored-structure is false', async () => {
          const call = async () => await axios.get(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/_single_`, {
            headers: {
              ...headersWithAuthorization,
              'use-pre-stored-structure': 'false',
            }
          });
          await expect(call()).rejects.toHaveProperty('response.data.error', ["Please set structure in Request Header"]);
        });

        test('throws error when use-pre-stored-structure is not set', async () => {
          const call = async () => await axios.get(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/_single_`, {
            headers: {
              ...headersWithAuthorization
            }
          });
          await expect(call()).rejects.toHaveProperty('response.data.error', ["Please set structure in Request Header"]);
        });

      });

    })
  });


});

