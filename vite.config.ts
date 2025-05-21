import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // By omitting the 'https' property, Vite will default to serving over HTTP.
    // This resolves the TypeScript error while achieving the desired behavior.

    // Set the host to '0.0.0.0' to ensure it's accessible 
    // from outside the container if needed by Firebase Studio's preview mechanism.
    // Vite's default is 'localhost' (127.0.0.1), which is usually fine for previews
    // running within the same containerized environment.
    host: '0.0.0.0', 
    // You can also specify a port if you need it to be different from the default (5173)
    // port: 3000, // Example: if your preview is configured for port 3000
  }
})
