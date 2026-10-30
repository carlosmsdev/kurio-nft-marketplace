import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import './style.css';
import './figma.css';
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000, refetchOnWindowFocus: true } } });
async function bootstrap() {
    if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
        const { worker } = await import('./mocks/browser');
        await worker.start({ onUnhandledRequest: 'bypass' });
        const { connectRealtime } = await import('./lib/realtime');
        connectRealtime(queryClient);
    }
    createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={queryClient}><RouterProvider router={router}/></QueryClientProvider></React.StrictMode>);
}
bootstrap().catch(error => {
    console.error('Falha ao iniciar aplicação', error);
    const root = document.getElementById('root');
    if (root)
        root.textContent = 'Falha ao inicializar os mocks. Execute npm run setup:mock e recarregue a página.';
});

