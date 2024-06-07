import axios from 'axios';
import { baseUrl } from './utils';


describe('Gateway endpoints End-to-End Tests', () => {
  const axiosInstance = axios.create(
    {
      baseURL: `${baseUrl}/gateway/*`,
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyRGV0YWlscyI6eyJfaWQiOiI2NjYzMDc5ZmIzZmE3YzA5NjgzN2M0MzAiLCJlbWFpbCI6ImplZ2VkZWFraW50dW5kZUBnbWFpbC5jb20iLCJwYXNzd29yZCI6IkplZ3V6MjE2KiIsImZpcnN0TmFtZSI6IkFraW50dW5kZSIsImxhc3ROYW1lIjoiSmVnZWRlIn0sImlhdCI6MTcxNzc2NjA0NywiZXhwIjoxNzE3ODk1NjQ3fQ.KloQScYJp2H5fhBrxezagkkISO7oegOvqFdGQBJ6J24',
      },
    }
  );

  test('should get list of projects', async () => {
    const response = await axiosInstance.get("projects");
    expect(response.status).toBe(200);
  });

  test('should add a view for a recordSpace', async () => {
    const response = await axiosInstance.post(`/views/666309862b97f2046f07442c/666309862b97f2046f07442d`, {
      data: { "field": "key" }
    });

    expect(response.data).toMatchObject({
      recordSpaceId: '666309862b97f2046f07442d',
      data: { field: 'key' },
      projectId: '666309862b97f2046f07442c'

    })
    expect(response.status).toBe(201);
  });

  test('should get a list of views for a recordSpace', async () => {

    const response = await axiosInstance.get(`/views/666309862b97f2046f07442c/666309862b97f2046f07442d`);
    const views = response.data;

    const foundView = views.find((v: any) => v.data.field);

    expect(foundView).toMatchObject({
      recordSpaceId: '666309862b97f2046f07442d',
      data: { field: 'key' },
      projectId: '666309862b97f2046f07442c'
    });

    expect(response.status).toBe(200);
  });


  test('should edit a view', async () => {
    const addedViewResponse = await axiosInstance.post(`/views/666309862b97f2046f07442c/666309862b97f2046f07442d`, {
      data: { "field1": "key" }
    });
    const addedView = addedViewResponse.data;

    const editedViewresponse = await axiosInstance.post(`/views/${addedView._id}`, {
      data: { "updatedField": "key" }
    });

    const reRequestedEditedViewresponse = await axiosInstance.get(`/views/${addedView._id}`);

    expect(reRequestedEditedViewresponse.data.data).toMatchObject({ "updatedField": "key" });

    expect(editedViewresponse.status).toBe(201);
    expect(reRequestedEditedViewresponse.status).toBe(200);
  });

  test("get a view", async () => {

    const addedViewResponse = await axiosInstance.post(`/views/666309862b97f2046f07442c/666309862b97f2046f07442d`, {
      data: { "field1": "key" }
    });
    const addedView = addedViewResponse.data;


    const response = await axiosInstance.get(`/views/${addedView._id}`);

    expect(response.data._id).toEqual(`${addedView._id}`);

    expect(response.data.data).toMatchObject({ "field1": "key" });

    expect(response.status).toBe(200);
  })


  test("get  view via bulk resources", async () => {

    const addedViewResponse = await axiosInstance.post(`/views/666309862b97f2046f07442c/666309862b97f2046f07442d`, {
      data: { "field1": "key" }
    });
    const addedView = addedViewResponse.data;


    const { data: getBulkResouces, status } = await axiosInstance.get(`/bulk-project-resources`);


    const projectWithView = getBulkResouces.getProjects.find((p: any) => p.id === "666309862b97f2046f07442c");
    const recordSpaceWithView = projectWithView.recordSpaces.find((rs: any) => rs._id === "666309862b97f2046f07442d");


    const addedViewInBulkResources = recordSpaceWithView.views.find((v: any) => String(v._id) === `${String(addedView._id)}`);
    expect(addedViewInBulkResources).toMatchObject({ _id: `${addedView._id}`, data: { field1: 'key' } });
    expect(status).toBe(200);
  });
});

