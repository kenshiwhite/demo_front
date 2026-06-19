import client from './client';

export const getSuppliers = async () => {
    const response = await client.get('/api/auth/suppliers/');
    return response.data;
};

export const getProducts = async (supplierId = null, search = '') => {
    let url = '/api/catalog/products/?';
    if (supplierId) url += `supplier=${supplierId}&`;
    if (search) url += `search=${search}&`;
    const response = await client.get(url);
    return response.data;
};

export const getAllProducts = async (search = '') => {
    let url = '/api/catalog/products/?';
    if (search) url += `search=${search}&`;
    const response = await client.get(url);
    return response.data;
};