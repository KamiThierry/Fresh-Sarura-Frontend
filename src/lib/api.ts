const API_BASE_URL = 'http://localhost:3000/api/v1';

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
});

export const api = {
    get: async (endpoint: string) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: getHeaders(),
        });
        const result = await response.json();
        if (!response.ok) {
            const error: any = new Error(result.message || 'Something went wrong');
            error.code = result.code;
            error.overdraftDetails = result.overdraftDetails;
            error.status = response.status;
            throw error;
        }
        return result;
    },
    post: async (endpoint: string, data: object) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) {
            const error: any = new Error(result.message || 'Something went wrong');
            error.code = result.code;
            error.status = response.status;
            throw error;
        }
        return result;
    },
    patch: async (endpoint: string, data: object) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) {
            const error: any = new Error(result.message || 'Something went wrong');
            error.code = result.code;
            error.overdraftDetails = result.overdraftDetails;
            error.status = response.status;
            throw error;
        }
        return result;
    },
    delete: async (endpoint: string) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Something went wrong');
        return result;
    },
};