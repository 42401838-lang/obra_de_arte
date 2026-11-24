// Elementos del formulario que se usan para leer la búsqueda y mostrar avisos.
const formularioBusqueda = document.getElementById("formBusqueda");
const campoBusqueda = document.getElementById("cadenaBusqueda");
const avisoBusqueda = document.getElementById("errorBusqueda");

// La sección contiene el espacio donde se insertan las fichas de las obras.
const seccionResultados = document.getElementById("seccion-respuestas");
const contenedorObras = document.getElementById("obras");
const botonBuscar = formularioBusqueda.querySelector('button[type="submit"]');

// Dirección base a la que se agrega el criterio de cada búsqueda.
const urlApiObras = "https://nearness-cyclist-debtor.ngrok-free.dev/pf/obras/index.php";

// El envío del formulario llama a buscarObras, incluso si se hace con Enter.
formularioBusqueda.addEventListener("submit", buscarObras);

async function buscarObras(evento) {
    // Se cancela el envío normal para actualizar los resultados en la misma página.
    evento.preventDefault();

    const terminoBusqueda = campoBusqueda.value.trim();
    avisoBusqueda.textContent = "";

    // Si el campo queda vacío después de quitar los espacios, se muestra un aviso.
    if (!terminoBusqueda) {
        avisoBusqueda.textContent = "Proporciona la cadena de búsqueda.";
        campoBusqueda.focus();
        return;
    }

    // El radio seleccionado indica qué parámetro recibe la API: q, tipo, anio o m.
    const radioSeleccionado = formularioBusqueda.querySelector('input[name="criterio"]:checked');
    const criterioBusqueda = radioSeleccionado.value;
    const urlConsulta = new URL(urlApiObras);
    urlConsulta.searchParams.set(criterioBusqueda, terminoBusqueda);

    // Se retiran las fichas anteriores y se desactiva Buscar mientras responde la API.
    seccionResultados.hidden = true;
    contenedorObras.innerHTML = "";
    botonBuscar.disabled = true;

    // La promesa entrega los datos de la petición GET o informa por qué falló.
    const promesaObras = new Promise(function (resolver, rechazar) {
        const solicitudObras = new XMLHttpRequest();

        solicitudObras.open("GET", urlConsulta.href);
        solicitudObras.setRequestHeader("ngrok-skip-browser-warning", "true");
        solicitudObras.timeout = 15000;

        // Si el estado HTTP indica éxito, se intenta convertir la respuesta JSON.
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

        // Estos eventos cubren los fallos de conexión y el límite de 15 segundos.
        solicitudObras.onerror = function () {
            rechazar(new Error("Error de red o CORS."));
        };

        solicitudObras.ontimeout = function () {
            rechazar(new Error("La API tardó demasiado en responder."));
        };

        solicitudObras.send();
    });

    // En esta cadena se acumula el HTML de todas las fichas.
    let salidaObras = "";

    try {
        // await espera los datos antes de comprobar si la respuesta es un arreglo.
        const obrasEncontradas = await promesaObras;

        if (!Array.isArray(obrasEncontradas)) {
            throw new Error("La API no devolvió un arreglo de obras.");
        }

        // Un arreglo vacío indica que la consulta terminó sin coincidencias.
        if (obrasEncontradas.length === 0) {
            avisoBusqueda.textContent = "No se encontraron obras para esa búsqueda.";
            return;
        }

        // Se escapan los caracteres especiales para mostrar los datos como texto al usar innerHTML.
        const escaparHtml = (valor) => String(valor ?? "—")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");

        // Cada obra agrega una ficha con su imagen y sus datos al HTML de salida.
        obrasEncontradas.forEach((obra) => {
            const tituloObra = escaparHtml(obra.titulo);
            let imagenObra = "";

            if (obra.imagen) {
                // Se quitan las barras iniciales para resolver la ruta desde la carpeta de la API.
                const urlImagen = new URL(obra.imagen.replace(/^\/+/, ""), urlApiObras);

                if (urlImagen.protocol === "https:" || urlImagen.protocol === "http:") {
                    imagenObra = `
                        <div class="col-12 col-md-6">
                            <img src="${escaparHtml(urlImagen.href)}" class="img-fluid" alt="${tituloObra}">
                        </div>`;
                }
            }

            // Desde el tamaño mediano, la imagen y los datos van lado a lado.
            // Si la ficha no incluye imagen, los datos ocupan todo su ancho.
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

        // Se insertan todas las fichas juntas y se hace visible la sección de resultados.
        contenedorObras.innerHTML = salidaObras;
        seccionResultados.hidden = false;
    } catch (error) {
        // La página muestra un aviso breve y la consola conserva el detalle del error.
        console.error(error);
        avisoBusqueda.textContent = "No se pudo completar la búsqueda. Intenta de nuevo.";
    } finally {
        // Buscar vuelve a habilitarse aunque falle la petición o no haya coincidencias.
        botonBuscar.disabled = false;
    }
}