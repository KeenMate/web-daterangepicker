import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DateRangePicker',
      formats: ['es', 'umd'],
      fileName: (format) => `date-range-picker.${format === 'es' ? 'js' : 'umd.js'}`
    },
    rollupOptions: {
      // Floating UI will be bundled into the component
      external: [],
      output: {
        globals: {}
      }
    }
  }
});
