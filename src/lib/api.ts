import axios from 'axios';
export const api = axios.create({ baseURL: '/api', timeout: 10000 });
api.interceptors.response.use(response => response, error => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && !['/login', '/register', '/session'].includes(error.config?.url ?? '')) {
        window.dispatchEvent(new Event('kurio:auth-expired'));
    }
    return Promise.reject(error);
});
export async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
    const response = await api.get<T>(path, { signal });
    return response.data;
}
export function message(error: unknown): string {
    return axios.isAxiosError(error) ? (error.response?.data as {
        message?: string;
    } | undefined)?.message ?? 'Falha de conexão. Tente novamente.' : error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
}

