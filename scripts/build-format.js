import { build } from 'vite';
import fs from 'fs/promises';
import path from 'path';

async function buildFormat() {
  await build({
    build: {
      manifest: true,
      rollupOptions: {
        input: 'src/main.ts',
        output: {
          format: 'iife',
          name: 'story'
        }
      }
    }
  });

  // Read the manifest to get the correct filename
  const manifest = JSON.parse(
    await fs.readFile('dist/.vite/manifest.json', 'utf-8')
  );
  
  const mainJsPath = manifest['src/main.ts'].file;
  
  // Read the built JS using the correct filename
  const builtJs = await fs.readFile(
    path.resolve('dist', mainJsPath),
    'utf-8'
  );

  // Rest of your build script remains the same
  let template = await fs.readFile(
    path.resolve('index.html'),
    'utf-8'
  );

  template = template.replace(
    '<script type="module" src="/src/main.ts"></script>',
    `<script>${builtJs}</script>`
  );

  const formatDefinition = (await import('../src/format-definition.js')).formatDefinition;
  formatDefinition.source = template;

  const jsonp = `window.storyFormat(${JSON.stringify(formatDefinition, null, 2)});`;

  await fs.writeFile(
    path.resolve('dist/format.js'),
    jsonp
  );
}

buildFormat().catch(console.error);