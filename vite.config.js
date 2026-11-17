import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
 plugins: [react()],
 resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url))}},
 server: {proxy: {'/api': 'http://localhost:8000'}},
 build: { target: ['chrome87','edge88','firefox78','safari14'] }
});
