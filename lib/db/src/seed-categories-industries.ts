import { db } from "../src";
import { categoriesTable } from "../src/schema/categories";
import { industriesTable } from "../src/schema/industries";

async function seed() {
  // Categorías de servicios
  const serviceCategories = [
    { name: "Desarrollo de software", icon: "🧑‍💻", type: "service", description: "Creación de aplicaciones, sistemas y soluciones digitales a medida." },
    { name: "Diseño gráfico", icon: "🎨", type: "service", description: "Servicios de identidad visual, branding, ilustración y diseño digital." },
    { name: "Marketing digital", icon: "📈", type: "service", description: "Publicidad, redes sociales, SEO, SEM y estrategias digitales." },
    { name: "Reparaciones técnicas", icon: "🛠️", type: "service", description: "Solución de fallas y mantenimiento de equipos electrónicos y electrodomésticos." },
    { name: "Logística y transporte", icon: "🚚", type: "service", description: "Envío, distribución y gestión de mercancías y personas." },
    { name: "Limpieza", icon: "🧹", type: "service", description: "Limpieza de hogares, oficinas, empresas y espacios públicos." },
    { name: "Seguridad", icon: "🔐", type: "service", description: "Vigilancia, alarmas, monitoreo y protección de bienes y personas." },
    { name: "Asesoría legal", icon: "⚖️", type: "service", description: "Consultoría jurídica, defensa y trámites legales." },
    { name: "Contabilidad", icon: "📊", type: "service", description: "Gestión contable, impositiva y financiera para empresas y particulares." },
    { name: "Entrenamiento personal", icon: "🏋️", type: "service", description: "Planes de ejercicio, fitness y entrenamiento físico personalizado." },
    { name: "Catering / comida", icon: "🍳", type: "service", description: "Preparación y entrega de alimentos para eventos y empresas." },
    { name: "Educación / cursos", icon: "🎓", type: "service", description: "Clases, talleres, capacitaciones y formación profesional." },
    { name: "Fotografía y video", icon: "📸", type: "service", description: "Cobertura de eventos, sesiones, edición y producción audiovisual." },
    { name: "Belleza y estética", icon: "💇", type: "service", description: "Peluquería, maquillaje, tratamientos faciales y corporales." },
    { name: "Construcción / albañilería", icon: "🏠", type: "service", description: "Obras, reformas, ampliaciones y trabajos de albañilería." },
    { name: "Mantenimiento industrial", icon: "🔧", type: "service", description: "Reparación y mantenimiento de maquinaria y equipos industriales." },
    { name: "Cuidado de mascotas", icon: "🐶", type: "service", description: "Paseo, guardería, adiestramiento y atención veterinaria." },
    { name: "Hosting y VPS", icon: "🌐", type: "service", description: "Alojamiento web, servidores virtuales y servicios en la nube." },
    { name: "Desarrollo de apps", icon: "📱", type: "service", description: "Creación de aplicaciones móviles para Android y iOS." },
    { name: "Consultoría empresarial", icon: "🧠", type: "service", description: "Estrategia, gestión y optimización de negocios y empresas." },
  ];

  // Categorías de productos
  const productCategories = [
    { name: "Electrónica", icon: "📱", type: "product", description: "Dispositivos electrónicos, gadgets y tecnología." },
    { name: "Ropa y moda", icon: "👕", type: "product", description: "Prendas de vestir, accesorios y tendencias de moda." },
    { name: "Calzado", icon: "👟", type: "product", description: "Zapatos, zapatillas, botas y calzado deportivo." },
    { name: "Muebles", icon: "🛋️", type: "product", description: "Sillas, mesas, sillones y mobiliario para el hogar y oficina." },
    { name: "Hogar y decoración", icon: "🏠", type: "product", description: "Artículos para el hogar, decoración y ambientación." },
    { name: "Alimentos", icon: "🍔", type: "product", description: "Comida, bebidas y productos alimenticios en general." },
    { name: "Cosméticos", icon: "🧴", type: "product", description: "Maquillaje, cuidado personal y productos de belleza." },
    { name: "Salud y farmacia", icon: "💊", type: "product", description: "Medicamentos, suplementos y productos para la salud." },
    { name: "Libros", icon: "📚", type: "product", description: "Libros, revistas y material de lectura." },
    { name: "Juguetes", icon: "🧸", type: "product", description: "Juguetes, juegos y entretenimiento para niños." },
    { name: "Computación", icon: "🖥️", type: "product", description: "PCs, notebooks, periféricos y accesorios de computación." },
    { name: "Accesorios tecnológicos", icon: "🔌", type: "product", description: "Cables, cargadores, fundas y accesorios para dispositivos." },
    { name: "Repuestos automotrices", icon: "🚗", type: "product", description: "Piezas, repuestos y accesorios para autos y motos." },
    { name: "Deportes y fitness", icon: "🚲", type: "product", description: "Equipamiento, ropa y accesorios deportivos." },
    { name: "Videojuegos", icon: "🎮", type: "product", description: "Consolas, juegos y accesorios gamer." },
    { name: "Mascotas", icon: "🐕", type: "product", description: "Alimentos, juguetes y productos para mascotas." },
    { name: "Herramientas", icon: "🛠️", type: "product", description: "Herramientas manuales y eléctricas para todo tipo de trabajos." },
    { name: "Jardinería", icon: "🌱", type: "product", description: "Plantas, semillas, herramientas y productos de jardinería." },
    { name: "Regalos", icon: "🎁", type: "product", description: "Artículos para obsequiar en ocasiones especiales." },
    { name: "Viajes y accesorios", icon: "🧳", type: "product", description: "Maletas, bolsos y accesorios para viajes." },
  ];

  // Tipos de empresas (industries)
  const industries = [
    { name: "Comercio minorista", description: "Venta de productos directamente al consumidor final." },
    { name: "Comercio mayorista", description: "Venta de productos a otras empresas o comercios." },
    { name: "Industria / fábrica", description: "Producción y manufactura de bienes y productos." },
    { name: "Empresa tecnológica", description: "Desarrollo y comercialización de tecnología y software." },
    { name: "Constructora", description: "Construcción de obras civiles, viviendas y edificios." },
    { name: "Empresa logística", description: "Transporte, almacenamiento y distribución de mercancías." },
    { name: "Restaurante", description: "Servicios de comida y bebidas para consumo en el lugar o delivery." },
    { name: "Hotel / turismo", description: "Alojamiento, viajes y servicios turísticos." },
    { name: "Clínica / salud", description: "Atención médica, consultorios y servicios de salud." },
    { name: "Institución educativa", description: "Escuelas, universidades y centros de formación." },
    { name: "Agencia de marketing", description: "Publicidad, comunicación y estrategias de marketing." },
    { name: "Estudio jurídico", description: "Servicios legales, asesoría y representación jurídica." },
    { name: "Financiera / fintech", description: "Servicios financieros, bancarios y tecnología financiera." },
    { name: "Estudio contable", description: "Contabilidad, auditoría y asesoría fiscal." },
    { name: "Servicios técnicos", description: "Reparación, mantenimiento y soporte técnico." },
    { name: "Productora audiovisual", description: "Producción de contenidos audiovisuales y multimedia." },
    { name: "Agropecuaria", description: "Producción agrícola y ganadera, insumos y servicios rurales." },
    { name: "E-commerce", description: "Comercio electrónico y ventas online." },
    { name: "Startup", description: "Empresas emergentes e innovadoras de rápido crecimiento." },
    { name: "ONG / fundación", description: "Organizaciones sin fines de lucro y fundaciones." },
  ];

  await db.insert(categoriesTable).values([...serviceCategories, ...productCategories]).onConflictDoNothing();
  await db.insert(industriesTable).values(industries).onConflictDoNothing();

  console.log("Categorías y tipos de empresas insertados correctamente.");
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
