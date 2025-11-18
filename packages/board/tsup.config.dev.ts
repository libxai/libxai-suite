import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Skip type generation for faster builds
  splitting: false,
  sourcemap: true,
  clean: false, // Don't clean on every rebuild
  external: ['react', 'react-dom', 'ai'],
  treeshake: false, // Disable for faster builds
  minify: false, // No minification for development
  target: 'es2020',
  esbuildOptions(options) {
    options.banner = {
      js: '"use client"',
    }
  },
  // Compile CSS with PostCSS (includes postcss-import, Tailwind, autoprefixer)
  async onSuccess() {
    const { execSync } = await import('child_process')

    try {
      // Use postcss CLI to process @import directives, Tailwind, and autoprefixer
      execSync(
        'npx postcss ./src/styles/index.css -o ./dist/styles.css --config ./postcss.config.js',
        { cwd: __dirname, stdio: 'inherit' }
      )
      console.log('✓ CSS compiled with PostCSS (import + Tailwind + autoprefixer) to dist/styles.css')
    } catch (error) {
      console.error('Failed to compile CSS:', error)
      throw error
    }
  },
})
