/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
    
    // Configuração de coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-utils/',
        'src/**/*.d.ts',
        'src/**/*.config.*',
        'src/**/*.test.*',
        'src/**/*.spec.*',
        'coverage/',
        'dist/',
        '.next/',
        'src/generated/',
        'src/mocks/',
      ],
      include: [
        'src/**/*.{js,jsx,ts,tsx}',
      ],
    },
    
    // Configuração para resolver módulos
    alias: {
      '@': resolve(__dirname, './src'),
    },
    
    // Configuração para incluir/excluir arquivos de teste
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage',
      'src/generated',
    ],
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
