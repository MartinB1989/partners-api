import * as fs from 'fs';
import * as path from 'path';

function searchAndReplaceInFiles(
  directory: string,
  searchRegex: RegExp,
  replacement: string,
) {
  const files = fs.readdirSync(directory);

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (
      stats.isDirectory() &&
      !filePath.includes('node_modules') &&
      !filePath.includes('dist')
    ) {
      // Recursivamente buscar en subdirectorios
      searchAndReplaceInFiles(filePath, searchRegex, replacement);
    } else if (
      stats.isFile() &&
      (file.endsWith('.ts') || file.endsWith('.js'))
    ) {
      // Solo procesar archivos .ts y .js
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // Hacer el reemplazo
        content = content.replace(searchRegex, replacement);

        // Si el contenido cambió, escribir el archivo de nuevo
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Actualizado: ${filePath}`);
        }
      } catch (error) {
        console.error(`Error procesando ${filePath}:`, error);
      }
    }
  });
}

// Expresiones regulares para capturar las importaciones que necesitamos cambiar
const importRegex = /from\s+['"]\.{1,3}\/.*generated\/prisma['"]/g;
const replacement = "from '@prisma/client'";

// Iniciar la búsqueda desde el directorio actual
searchAndReplaceInFiles('./src', importRegex, replacement);
searchAndReplaceInFiles('./prisma', importRegex, replacement);

console.log('Proceso completado.');
