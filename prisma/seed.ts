import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Función auxiliar para crear categorías solo si no existen
  async function createCategoryIfNotExists(
    name: string,
    level: number,
    parentId?: number,
  ) {
    const idName = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-');

    // Verificar si la categoría ya existe
    const existingCategory = await prisma.category.findUnique({
      where: { idName },
    });

    if (existingCategory) {
      console.log(`La categoría "${name}" ya existe, omitiendo creación.`);
      return existingCategory;
    }

    // Si no existe, la creamos
    return await prisma.category.create({
      data: {
        name,
        idName,
        level,
        parentId,
      },
    });
  }

  // Categorías de nivel 1 (Padres)
  const electronica = await createCategoryIfNotExists('Electrónica', 1);
  const moda = await createCategoryIfNotExists('Moda', 1);
  const hogar = await createCategoryIfNotExists('Hogar', 1);
  const deportes = await createCategoryIfNotExists('Deportes', 1);
  const bellezaCuidado = await createCategoryIfNotExists(
    'Belleza y Cuidado Personal',
    1,
  );
  const juguetesJuegos = await createCategoryIfNotExists(
    'Juguetes y Juegos',
    1,
  );
  const librosPapeleria = await createCategoryIfNotExists(
    'Libros y Papelería',
    1,
  );
  const saludBienestar = await createCategoryIfNotExists(
    'Salud y Bienestar',
    1,
  );

  // ELECTRÓNICA - Nivel 2 (Hijos)
  const telefonos = await createCategoryIfNotExists(
    'Teléfonos',
    2,
    electronica.id,
  );
  const computadoras = await createCategoryIfNotExists(
    'Computadoras',
    2,
    electronica.id,
  );
  const televisores = await createCategoryIfNotExists(
    'Televisores',
    2,
    electronica.id,
  );
  const audio = await createCategoryIfNotExists('Audio', 2, electronica.id);
  const camaras = await createCategoryIfNotExists('Cámaras', 2, electronica.id);

  // ELECTRÓNICA - Nivel 3 (Nietos)
  // Teléfonos
  await createCategoryIfNotExists('Smartphones', 3, telefonos.id);
  await createCategoryIfNotExists('Teléfonos básicos', 3, telefonos.id);
  await createCategoryIfNotExists('Accesorios para teléfonos', 3, telefonos.id);

  // Computadoras
  await createCategoryIfNotExists('Laptops', 3, computadoras.id);
  await createCategoryIfNotExists(
    'Computadoras de escritorio',
    3,
    computadoras.id,
  );
  await createCategoryIfNotExists('Tablets', 3, computadoras.id);
  await createCategoryIfNotExists(
    'Accesorios para computadoras',
    3,
    computadoras.id,
  );

  // Televisores
  await createCategoryIfNotExists('Televisores LED', 3, televisores.id);
  await createCategoryIfNotExists('Televisores OLED', 3, televisores.id);
  await createCategoryIfNotExists('Smart TV', 3, televisores.id);

  // Audio
  await createCategoryIfNotExists('Audífonos', 3, audio.id);
  await createCategoryIfNotExists('Bocinas', 3, audio.id);
  await createCategoryIfNotExists('Sistemas de sonido', 3, audio.id);
  await createCategoryIfNotExists('Micrófonos', 3, audio.id);

  // Cámaras
  await createCategoryIfNotExists('Cámaras digitales', 3, camaras.id);
  await createCategoryIfNotExists('Cámaras de video', 3, camaras.id);
  await createCategoryIfNotExists('Accesorios para cámaras', 3, camaras.id);

  // MODA - Nivel 2 (Hijos)
  const ropaMujer = await createCategoryIfNotExists(
    'Ropa de Mujer',
    2,
    moda.id,
  );
  const ropaHombre = await createCategoryIfNotExists(
    'Ropa de Hombre',
    2,
    moda.id,
  );
  const calzado = await createCategoryIfNotExists('Calzado', 2, moda.id);
  const accesoriosModa = await createCategoryIfNotExists(
    'Accesorios',
    2,
    moda.id,
  );

  // MODA - Nivel 3 (Nietos)
  // Ropa de Mujer
  await createCategoryIfNotExists('Vestidos', 3, ropaMujer.id);
  await createCategoryIfNotExists('Blusas', 3, ropaMujer.id);
  await createCategoryIfNotExists('Pantalones', 3, ropaMujer.id);
  await createCategoryIfNotExists('Faldas', 3, ropaMujer.id);

  // Ropa de Hombre
  await createCategoryIfNotExists('Camisas', 3, ropaHombre.id);
  await createCategoryIfNotExists('Pantalones', 3, ropaHombre.id);
  await createCategoryIfNotExists('Trajes', 3, ropaHombre.id);
  await createCategoryIfNotExists('Sudaderas', 3, ropaHombre.id);

  // Calzado
  await createCategoryIfNotExists('Zapatos formales', 3, calzado.id);
  await createCategoryIfNotExists('Zapatos casuales', 3, calzado.id);
  await createCategoryIfNotExists('Zapatillas deportivas', 3, calzado.id);
  await createCategoryIfNotExists('Sandalias', 3, calzado.id);

  // Accesorios
  await createCategoryIfNotExists('Bolsos', 3, accesoriosModa.id);
  await createCategoryIfNotExists('Relojes', 3, accesoriosModa.id);
  await createCategoryIfNotExists('Joyería', 3, accesoriosModa.id);
  await createCategoryIfNotExists('Gafas de sol', 3, accesoriosModa.id);

  // HOGAR - Nivel 2 (Hijos)
  const muebles = await createCategoryIfNotExists('Muebles', 2, hogar.id);
  const decoracion = await createCategoryIfNotExists('Decoración', 2, hogar.id);
  const cocina = await createCategoryIfNotExists('Cocina', 2, hogar.id);
  const jardin = await createCategoryIfNotExists('Jardín', 2, hogar.id);

  // HOGAR - Nivel 3 (Nietos)
  // Muebles
  await createCategoryIfNotExists('Sala', 3, muebles.id);
  await createCategoryIfNotExists('Recámara', 3, muebles.id);
  await createCategoryIfNotExists('Comedor', 3, muebles.id);
  await createCategoryIfNotExists('Oficina', 3, muebles.id);

  // Decoración
  await createCategoryIfNotExists('Cuadros', 3, decoracion.id);
  await createCategoryIfNotExists('Lámparas', 3, decoracion.id);
  await createCategoryIfNotExists('Plantas artificiales', 3, decoracion.id);
  await createCategoryIfNotExists('Cortinas', 3, decoracion.id);

  // Cocina
  await createCategoryIfNotExists('Utensilios', 3, cocina.id);
  await createCategoryIfNotExists('Electrodomésticos', 3, cocina.id);
  await createCategoryIfNotExists('Vajilla', 3, cocina.id);
  await createCategoryIfNotExists('Organizadores', 3, cocina.id);

  // Jardín
  await createCategoryIfNotExists('Muebles de exterior', 3, jardin.id);
  await createCategoryIfNotExists('Plantas', 3, jardin.id);
  await createCategoryIfNotExists('Herramientas', 3, jardin.id);
  await createCategoryIfNotExists('Decoración exterior', 3, jardin.id);

  // DEPORTES - Nivel 2 (Hijos)
  const fitness = await createCategoryIfNotExists('Fitness', 2, deportes.id);
  const deportesEquipo = await createCategoryIfNotExists(
    'Deportes de equipo',
    2,
    deportes.id,
  );
  const ciclismo = await createCategoryIfNotExists('Ciclismo', 2, deportes.id);
  const acuaticos = await createCategoryIfNotExists(
    'Acuáticos',
    2,
    deportes.id,
  );

  // DEPORTES - Nivel 3 (Nietos)
  // Fitness
  await createCategoryIfNotExists('Pesas', 3, fitness.id);
  await createCategoryIfNotExists('Máquinas de ejercicio', 3, fitness.id);
  await createCategoryIfNotExists('Ropa deportiva', 3, fitness.id);
  await createCategoryIfNotExists('Accesorios', 3, fitness.id);

  // Deportes de equipo
  await createCategoryIfNotExists('Fútbol', 3, deportesEquipo.id);
  await createCategoryIfNotExists('Básquetbol', 3, deportesEquipo.id);
  await createCategoryIfNotExists('Voleibol', 3, deportesEquipo.id);
  await createCategoryIfNotExists('Béisbol', 3, deportesEquipo.id);

  // Ciclismo
  await createCategoryIfNotExists('Bicicletas', 3, ciclismo.id);
  await createCategoryIfNotExists('Accesorios', 3, ciclismo.id);
  await createCategoryIfNotExists('Ropa', 3, ciclismo.id);
  await createCategoryIfNotExists('Repuestos', 3, ciclismo.id);

  // Acuáticos
  await createCategoryIfNotExists('Natación', 3, acuaticos.id);
  await createCategoryIfNotExists('Surf', 3, acuaticos.id);
  await createCategoryIfNotExists('Buceo', 3, acuaticos.id);
  await createCategoryIfNotExists('Pesca', 3, acuaticos.id);

  // BELLEZA Y CUIDADO PERSONAL - Nivel 2 (Hijos)
  const cuidadoFacial = await createCategoryIfNotExists(
    'Cuidado facial',
    2,
    bellezaCuidado.id,
  );
  const cuidadoCapilar = await createCategoryIfNotExists(
    'Cuidado capilar',
    2,
    bellezaCuidado.id,
  );
  const maquillaje = await createCategoryIfNotExists(
    'Maquillaje',
    2,
    bellezaCuidado.id,
  );
  const fragancias = await createCategoryIfNotExists(
    'Fragancias',
    2,
    bellezaCuidado.id,
  );

  // BELLEZA Y CUIDADO PERSONAL - Nivel 3 (Nietos)
  // Cuidado facial
  await createCategoryIfNotExists('Limpiadores', 3, cuidadoFacial.id);
  await createCategoryIfNotExists('Cremas', 3, cuidadoFacial.id);
  await createCategoryIfNotExists('Mascarillas', 3, cuidadoFacial.id);
  await createCategoryIfNotExists('Tratamientos', 3, cuidadoFacial.id);

  // Cuidado capilar
  await createCategoryIfNotExists('Shampoo', 3, cuidadoCapilar.id);
  await createCategoryIfNotExists('Acondicionadores', 3, cuidadoCapilar.id);
  await createCategoryIfNotExists('Tratamientos', 3, cuidadoCapilar.id);
  await createCategoryIfNotExists('Estilizadores', 3, cuidadoCapilar.id);

  // Maquillaje
  await createCategoryIfNotExists('Rostro', 3, maquillaje.id);
  await createCategoryIfNotExists('Ojos', 3, maquillaje.id);
  await createCategoryIfNotExists('Labios', 3, maquillaje.id);
  await createCategoryIfNotExists('Accesorios', 3, maquillaje.id);

  // Fragancias
  await createCategoryIfNotExists('Perfumes', 3, fragancias.id);
  await createCategoryIfNotExists('Lociones', 3, fragancias.id);
  await createCategoryIfNotExists('Desodorantes', 3, fragancias.id);
  await createCategoryIfNotExists('Ambientadores', 3, fragancias.id);

  // JUGUETES Y JUEGOS - Nivel 2 (Hijos)
  const juguetesEducativos = await createCategoryIfNotExists(
    'Juguetes educativos',
    2,
    juguetesJuegos.id,
  );
  const juguetesBebe = await createCategoryIfNotExists(
    'Juguetes para bebés',
    2,
    juguetesJuegos.id,
  );
  const juegosMesa = await createCategoryIfNotExists(
    'Juegos de mesa',
    2,
    juguetesJuegos.id,
  );
  const videojuegos = await createCategoryIfNotExists(
    'Videojuegos',
    2,
    juguetesJuegos.id,
  );

  // JUGUETES Y JUEGOS - Nivel 3 (Nietos)
  // Juguetes educativos
  await createCategoryIfNotExists('STEM', 3, juguetesEducativos.id);
  await createCategoryIfNotExists(
    'Arte y manualidades',
    3,
    juguetesEducativos.id,
  );
  await createCategoryIfNotExists('Música', 3, juguetesEducativos.id);
  await createCategoryIfNotExists('Lectura', 3, juguetesEducativos.id);

  // Juguetes para bebés
  await createCategoryIfNotExists('Peluches', 3, juguetesBebe.id);
  await createCategoryIfNotExists('Sonajeros', 3, juguetesBebe.id);
  await createCategoryIfNotExists('Gimnasios', 3, juguetesBebe.id);
  await createCategoryIfNotExists('Móviles', 3, juguetesBebe.id);

  // Juegos de mesa
  await createCategoryIfNotExists('Estrategia', 3, juegosMesa.id);
  await createCategoryIfNotExists('Familiares', 3, juegosMesa.id);
  await createCategoryIfNotExists('Cartas', 3, juegosMesa.id);
  await createCategoryIfNotExists('Puzzles', 3, juegosMesa.id);

  // Videojuegos
  await createCategoryIfNotExists('Consolas', 3, videojuegos.id);
  await createCategoryIfNotExists('Juegos', 3, videojuegos.id);
  await createCategoryIfNotExists('Accesorios', 3, videojuegos.id);
  await createCategoryIfNotExists('Controles', 3, videojuegos.id);

  // LIBROS Y PAPELERÍA - Nivel 2 (Hijos)
  const libros = await createCategoryIfNotExists(
    'Libros',
    2,
    librosPapeleria.id,
  );
  const papeleria = await createCategoryIfNotExists(
    'Papelería',
    2,
    librosPapeleria.id,
  );
  const musica = await createCategoryIfNotExists(
    'Música',
    2,
    librosPapeleria.id,
  );
  const peliculasSeries = await createCategoryIfNotExists(
    'Películas y Series',
    2,
    librosPapeleria.id,
  );

  // LIBROS Y PAPELERÍA - Nivel 3 (Nietos)
  // Libros
  await createCategoryIfNotExists('Ficción', 3, libros.id);
  await createCategoryIfNotExists('No ficción', 3, libros.id);
  await createCategoryIfNotExists('Educativos', 3, libros.id);
  await createCategoryIfNotExists('Infantiles', 3, libros.id);

  // Papelería
  await createCategoryIfNotExists('Escritura', 3, papeleria.id);
  await createCategoryIfNotExists('Organización', 3, papeleria.id);
  await createCategoryIfNotExists('Arte', 3, papeleria.id);
  await createCategoryIfNotExists('Oficina', 3, papeleria.id);

  // Música
  await createCategoryIfNotExists('Instrumentos', 3, musica.id);
  await createCategoryIfNotExists('Partituras', 3, musica.id);
  await createCategoryIfNotExists('Accesorios', 3, musica.id);
  await createCategoryIfNotExists('Equipos de sonido', 3, musica.id);

  // Películas y Series
  await createCategoryIfNotExists('DVDs', 3, peliculasSeries.id);
  await createCategoryIfNotExists('Blu-rays', 3, peliculasSeries.id);
  await createCategoryIfNotExists('Streaming', 3, peliculasSeries.id);
  await createCategoryIfNotExists('Merchandising', 3, peliculasSeries.id);

  // SALUD Y BIENESTAR - Nivel 2 (Hijos)
  const suplementos = await createCategoryIfNotExists(
    'Suplementos',
    2,
    saludBienestar.id,
  );
  const equiposMedicos = await createCategoryIfNotExists(
    'Equipos médicos',
    2,
    saludBienestar.id,
  );
  const cuidadoPersonal = await createCategoryIfNotExists(
    'Cuidado personal',
    2,
    saludBienestar.id,
  );
  const mascotas = await createCategoryIfNotExists(
    'Mascotas',
    2,
    saludBienestar.id,
  );

  // SALUD Y BIENESTAR - Nivel 3 (Nietos)
  // Suplementos
  await createCategoryIfNotExists('Vitaminas', 3, suplementos.id);
  await createCategoryIfNotExists('Proteínas', 3, suplementos.id);
  await createCategoryIfNotExists('Energéticos', 3, suplementos.id);
  await createCategoryIfNotExists('Naturales', 3, suplementos.id);

  // Equipos médicos
  await createCategoryIfNotExists('Monitores', 3, equiposMedicos.id);
  await createCategoryIfNotExists('Terapia', 3, equiposMedicos.id);
  await createCategoryIfNotExists('Movilidad', 3, equiposMedicos.id);
  await createCategoryIfNotExists('Cuidado', 3, equiposMedicos.id);

  // Cuidado personal
  await createCategoryIfNotExists('Higiene', 3, cuidadoPersonal.id);
  await createCategoryIfNotExists('Bienestar', 3, cuidadoPersonal.id);
  await createCategoryIfNotExists('Relajación', 3, cuidadoPersonal.id);
  await createCategoryIfNotExists('Terapia', 3, cuidadoPersonal.id);

  // Mascotas
  await createCategoryIfNotExists('Alimentos', 3, mascotas.id);
  await createCategoryIfNotExists('Juguetes', 3, mascotas.id);
  await createCategoryIfNotExists('Cuidado', 3, mascotas.id);
  await createCategoryIfNotExists('Accesorios', 3, mascotas.id);

  console.log('¡Categorías creadas con éxito!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
