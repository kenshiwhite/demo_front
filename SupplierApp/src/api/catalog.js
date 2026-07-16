// src/api/catalog.js
import client from './client';

// filters: { categories: string[], minPrice, maxPrice, ordering }
const buildFilterParams = (filters = {}) => {
    const params = {};
    if (filters.categories && filters.categories.length) {
        params.category = filters.categories.join(',');
    }
    if (filters.minPrice) params.min_price = filters.minPrice;
    if (filters.maxPrice) params.max_price = filters.maxPrice;
    if (filters.ordering) params.ordering = filters.ordering;
    return params;
};

export const getProducts = async (supplierId, search = '', filters = {}) => {
    const params = { supplier: supplierId, ...buildFilterParams(filters) };
    if (search) params.search = search;
    const response = await client.get('/api/catalog/products/', { params });
    return response.data;
};

export const getAllProducts = async (search = '', city = null, filters = {}) => {
    const params = { ...buildFilterParams(filters) };
    if (search) params.search = search;
    if (city) params.city = city;
    const response = await client.get('/api/catalog/products/', { params });
    return response.data;
};

export const getCategories = async () => {
    const response = await client.get('/api/catalog/categories/');
    return response.data;
};

export const getSuppliers = async (city = null) => {
    const params = {};
    if (city) params.city = city;
    const response = await client.get('/api/auth/suppliers/', { params });
    return response.data;
};