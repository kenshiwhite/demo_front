import client from './client';

export const getProducts = async (supplierId, search = '') => {
    const params = { supplier: supplierId };
    if (search) params.search = search;
    const response = await client.get('/api/catalog/products/', { params });
    return response.data;
};

export const getAllProducts = async (search = '', city = null) => {
    const params = {};
    if (search) params.search = search;
    if (city) params.city = city;
    const response = await client.get('/api/catalog/products/', { params });
    return response.data;
};

export const getSuppliers = async (city = null) => {
    const params = {};
    if (city) params.city = city;
    const response = await client.get('/api/auth/suppliers/', { params });
    return response.data;
};