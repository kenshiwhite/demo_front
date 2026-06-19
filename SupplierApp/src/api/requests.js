import client from './client';

export const createRequest = async (data) => {
    const response = await client.post('/api/requests/', data);
    return response.data;
};

export const getMyRequests = async () => {
    const response = await client.get('/api/requests/');
    return response.data;
};
