// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './' // CRITICAL: เพื่อให้ asset ถูกโหลดถูกต้องบน GitHub Pages
});
