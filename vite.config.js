import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
    plugins: [preact()],
    build: {
        outDir: 'dist',
        emptyDirOnBuild: true,
        target: 'es2015',
        lib: {
            entry: resolve(__dirname, 'src/popup/main.jsx'),
            name: 'EdgenuityPopup',
            formats: ['iife'],
            fileName: () => 'popup.js',
        },
        rollupOptions: {
            output: {
                assetFileNames: '[name].[ext]',
            },
        },
    },
});
