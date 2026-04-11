import { Layout } from "@/components/layout/layout";
import { useSEO } from "@/hooks/use-seo";

export default function Terminos() {
  useSEO({
    title: "Terminos y Condiciones",
    description: "Terminos y condiciones de uso de Mil Laburos. Politica de privacidad y condiciones del servicio.",
    keywords: "terminos, condiciones, politica de privacidad, Mil Laburos",
  });

  return (
    <Layout>
      <div className="bg-muted/30 py-5 md:py-8 border-b">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-bold">Términos y Condiciones</h1>
          <p className="text-muted-foreground text-sm mt-1">Última actualización: {new Date().toLocaleDateString("es-AR")}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl prose prose-sm dark:prose-invert">
        <h2>1. Naturaleza de la plataforma</h2>
        <p>
          <strong>Mil Laburos</strong> es una plataforma digital que actúa exclusivamente como <strong>intermediaria</strong> entre
          personas que ofrecen servicios profesionales ("Proveedores") y personas que buscan contratar dichos servicios ("Clientes"),
          así como entre empresas que publican vacantes laborales y postulantes.
        </p>

        <h2>2. Rol de Mil Laburos</h2>
        <p>
          Mil Laburos <strong>no participa, gestiona ni interviene</strong> en la negociación, fijación de precios, cobros,
          pagos, ni en la prestación efectiva de los servicios publicados. La plataforma se limita a facilitar el contacto
          entre las partes.
        </p>

        <h2>3. Exención de responsabilidad</h2>
        <p>
          Mil Laburos <strong>no es responsable</strong> por:
        </p>
        <ul>
          <li>La calidad, cumplimiento o resultado de los servicios contratados a través de la plataforma.</li>
          <li>Los acuerdos económicos entre Proveedores y Clientes, incluyendo precios, formas de pago y plazos.</li>
          <li>Daños directos o indirectos derivados de la relación entre las partes.</li>
          <li>La veracidad de la información proporcionada por los usuarios en sus perfiles o publicaciones.</li>
          <li>Disputas laborales, contractuales o de cualquier otra índole entre usuarios.</li>
        </ul>

        <h2>4. Responsabilidad de los usuarios</h2>
        <p>
          Cada usuario es responsable de verificar la identidad, capacidad y antecedentes de la contraparte
          antes de concretar cualquier acuerdo. Mil Laburos recomienda solicitar referencias y documentación respaldatoria.
        </p>

        <h2>5. Uso de la plataforma</h2>
        <p>
          Los usuarios se comprometen a utilizar la plataforma de buena fe, proporcionando información veraz y
          absteniéndose de publicar contenido ilegal, engañoso u ofensivo. Mil Laburos se reserva el derecho de
          suspender o eliminar cuentas que incumplan estas condiciones.
        </p>

        <h2>6. Propiedad intelectual</h2>
        <p>
          Todo el contenido de la plataforma (diseño, código, marca, logotipos) es propiedad de Mil Laburos y
          sus desarrolladores. Queda prohibida su reproducción sin autorización expresa.
        </p>

        <h2>7. Modificaciones</h2>
        <p>
          Mil Laburos se reserva el derecho de modificar estos términos en cualquier momento. Los cambios serán
          publicados en esta página y entrarán en vigencia desde su publicación.
        </p>

        <h2>8. Contacto</h2>
        <p>
          Para consultas sobre estos términos, contactanos a{" "}
          <a href="mailto:soporte@millaburos.com" className="text-primary">soporte@millaburos.com</a>.
        </p>
      </div>
    </Layout>
  );
}
