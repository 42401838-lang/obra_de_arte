// Obtenemos el formulario, el campo de búsqueda y el elemento para mostrar avisos.
const formularioBusqueda = document.getElementById("formBusqueda");
const campoBusqueda = document.getElementById("cadenaBusqueda");
const avisoBusqueda = document.getElementById("errorBusqueda");

const seccionResultados = document.getElementById("seccion-respuestas");
const contenedorObras = document.getElementById("obras");
const botonBuscar = formularioBusqueda.querySelector('button[type="submit"]');

const urlApiObras = "https://nearness-cyclist-debtor.ngrok-free.dev/pf/obras/index.php";

// Ejecutamos buscarObras cuando se envía el formulario.
formularioBusqueda.addEventListener("submit", buscarObras);

async function buscarObras(evento) {
    // Cancelamos el envío normal para que la página no se recargue.
    evento.preventDefault();

    const terminoBusqueda = campoBusqueda.value.trim();
    avisoBusqueda.textContent = "";

    if (!terminoBusqueda) {
        avisoBusqueda.textContent = "Proporciona la cadena de búsqueda.";
        campoBusqueda.focus();
        return;
    }

    // El valor del radio indica el parámetro de la API: q, tipo, anio o m.
    const radioSeleccionado = formularioBusqueda.querySelector('input[name="criterio"]:checked');
    const criterioBusqueda = radioSeleccionado.value;
    const urlConsulta = new URL(urlApiObras);
    urlConsulta.searchParams.set(criterioBusqueda, terminoBusqueda);

    // Retiramos las fichas anteriores y desactivamos el botón durante la consulta.
    seccionResultados.hidden = true;
    contenedorObras.innerHTML = "";
    botonBuscar.disabled = true;

    // Creamos una promesa para realizar la solicitud al servidor.
    const promesaObras = new Promise(function (resolver, rechazar) {
        const solicitudObras = new XMLHttpRequest();

        solicitudObras.open("GET", urlConsulta.href);
        solicitudObras.setRequestHeader("ngrok-skip-browser-warning", "true");
        solicitudObras.timeout = 15000;

        // Comprobamos el estado HTTP y convertimos la respuesta JSON.
        solicitudObras.onload = function () {
            if (solicitudObras.status >= 200 && solicitudObras.status < 300) {
                try {
                    resolver(JSON.parse(solicitudObras.responseText));
                } catch {
                    rechazar(new Error("La respuesta JSON no es válida."));
                }
            } else {
                rechazar(new Error("Error HTTP " + solicitudObras.status));
            }
        };

        // Rechazamos la promesa si falla la conexión o se agota la espera.
        solicitudObras.onerror = function () {
            rechazar(new Error("Error de red o CORS."));
        };

        solicitudObras.ontimeout = function () {
            rechazar(new Error("La API tardó demasiado en responder."));
        };

        solicitudObras.send();
    });

    let salidaObras = "";

    try {
        // Esperamos la respuesta y comprobamos que sea un arreglo de obras.
        const obrasEncontradas = await promesaObras;

        if (!Array.isArray(obrasEncontradas)) {
            throw new Error("La API no devolvió un arreglo de obras.");
        }

        if (obrasEncontradas.length === 0) {
            avisoBusqueda.textContent = "No se encontraron obras para esa búsqueda.";
            return;
        }

        // Escapamos los datos de la API antes de insertarlos con innerHTML.
        const escaparHtml = (valor) => String(valor ?? "—")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");

        // Armamos una ficha por cada obra encontrada.
        obrasEncontradas.forEach((obra) => {
            const tituloObra = escaparHtml(obra.titulo);
            let imagenObra = "";

            if (obra.imagen) {
                // Resolvemos las rutas de la galería desde la carpeta de la API.
                const urlImagen = new URL(obra.imagen.replace(/^\/+/, ""), urlApiObras);

                if (urlImagen.protocol === "https:" || urlImagen.protocol === "http:") {
                    imagenObra = `
                        <div class="col-12 col-md-6">
                            <img src="${escaparHtml(urlImagen.href)}" class="img-fluid" alt="${tituloObra}">
                        </div>`;
                }
            }

            // En escritorio la imagen y los datos van lado a lado.
            // En móvil, la imagen queda arriba de los datos.
            const claseDatosObra = imagenObra ? "col-12 col-md-6" : "col-12";

            salidaObras += `
                <div class="col-12 col-md-6">
                    <article class="obra-resultado h-100">
                        <div class="row g-3">
                            ${imagenObra}
                            <div class="${claseDatosObra}">
                                <h3>${tituloObra}</h3>
                                <p>${escaparHtml(obra.descripcion)}</p>
                                <p>Artista: ${escaparHtml(obra.artista)}</p>
                                <p>Año: ${escaparHtml(obra.anio)}</p>
                                <p>Tipo: ${escaparHtml(obra.tipo)}</p>
                                <p>Movimiento: ${escaparHtml(obra.movimiento)}</p>
                            </div>
                        </div>
                    </article>
                </div>`;
        });

        // Insertamos las fichas en el contenedor y mostramos la sección.
        contenedorObras.innerHTML = salidaObras;
        seccionResultados.hidden = false;
    } catch (error) {
        // Mostramos un aviso en la página y dejamos el detalle en la consola.
        console.error(error);
        avisoBusqueda.textContent = "No se pudo completar la búsqueda. Intenta de nuevo.";
    } finally {
        botonBuscar.disabled = false;
    }
}