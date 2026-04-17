// ==================== ESTADO GLOBAL ====================
let idiomaComic = null;
let comicActual = null;
let textoPDF = '';
let textoActual = '';
let frases = [];
let fraseActualIdx = 0;
let lecturaEnCurso = false;
let lecturaInterval = null;
let velocidadSegundos = 3;

// Grabacion
let mediaRecorder = null;
let audioChunks = [];
let grabando = false;
let tiempoGrabacionInterval = null;
let tiempoGrabacionSegundos = 0;
let audioBlob = null;

// Estadisticas
let tiempoInicioLectura = null;
let frasesLeidas = 0;
let origenLectura = 'comic'; // 'comic' o 'pdf'

// ==================== INICIALIZACION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Cargar configuracion de IA (usa las keys hardcodeadas de common.js)
    cargarConfiguracion();

    actualizarSugerenciasComic();
    actualizarBotonComic();
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
});

// ==================== NAVEGACION ====================
function mostrarGeneradorComic() {
    mostrarPantalla('generadorComic');
    actualizarSugerenciasComic();
}

function mostrarCargaPDF() {
    mostrarPantalla('cargaPDF');
    document.getElementById('pdfInfo').innerHTML = '';
    document.getElementById('pdfPreview').style.display = 'none';
    document.getElementById('inputPDF').value = '';
}

function volverDesdeLectura() {
    detenerLectura();
    detenerGrabacion();
    if (origenLectura === 'comic') {
        mostrarPantalla('vistaComic');
    } else {
        mostrarPantalla('cargaPDF');
    }
}

// ==================== GENERADOR DE COMIC ====================
function seleccionarIdiomaComic(idioma) {
    idiomaComic = idioma;
    document.querySelectorAll('#generadorComic .idioma-btn').forEach(b => b.classList.remove('seleccionado'));
    const btn = document.querySelector(`#generadorComic .idioma-btn[data-idioma="${idioma}"]`);
    if (btn) btn.classList.add('seleccionado');
    actualizarBotonComic();
}

function actualizarSugerenciasComic() {
    const guardado = localStorage.getItem('usuarioAprendizaje');
    if (!guardado) return;

    const usuario = JSON.parse(guardado);
    const edad = usuario.edad;
    let categoria = 'infantil';
    if (edad >= 8 && edad <= 11) categoria = 'medio';
    if (edad >= 12) categoria = 'mayor';

    const sugerencias = {
        infantil: ['Un gatito aventurero', 'La princesa valiente', 'El robot amigable', 'Animales del bosque'],
        medio: ['Superheroes en la escuela', 'Viaje al espacio', 'El misterio del castillo', 'Deportes magicos'],
        mayor: ['Aventura en el tiempo', 'Mision submarina', 'El inventor genial', 'Exploradores del mundo']
    };

    document.getElementById('sugerenciasComic').innerHTML = sugerencias[categoria].map(s =>
        `<span class="tema-sugerencia" onclick="usarSugerenciaComic('${s}')">${s}</span>`
    ).join('');
}

function usarSugerenciaComic(tema) {
    document.getElementById('temaComic').value = tema;
    actualizarBotonComic();
}

function actualizarBotonComic() {
    const tema = document.getElementById('temaComic').value.trim();
    const btn = document.getElementById('btnGenerarComic');
    const msg = document.getElementById('mensajeComic');

    // Verificar qué falta
    let falta = [];
    if (!idiomaComic) falta.push('selecciona un idioma');
    if (tema.length < 3) falta.push('escribe un tema');

    // Verificar API key
    const key = configIA.keys[configIA.provider];
    if (!key) falta.push('configura tu API key');

    if (falta.length === 0) {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
        msg.innerHTML = '';
    } else {
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
        msg.innerHTML = `<span style="opacity:0.7">Falta: ${falta.join(', ')}</span>`;
    }
}

async function generarComic() {
    const tema = document.getElementById('temaComic').value.trim();
    const numPaneles = parseInt(document.getElementById('numPaneles').value);
    const key = configIA.keys[configIA.provider];

    if (!key) {
        document.getElementById('mensajeComic').innerHTML = '<span class="mensaje-error">Configura tu API key en Configuracion</span>';
        return;
    }

    if (esTemaInapropiado(tema)) {
        document.getElementById('mensajeComic').innerHTML = '<span class="mensaje-error">Ese tema no es apropiado</span>';
        return;
    }

    mostrarPantalla('generandoComic');
    actualizarProgresoComic('Generando historia con IA...', 0, numPaneles + 1);

    try {
        // Obtener edad del usuario
        const guardado = localStorage.getItem('usuarioAprendizaje');
        const usuario = guardado ? JSON.parse(guardado) : { edad: 10 };

        // Generar historia del comic
        const comic = await generarHistoriaComic(tema, numPaneles, idiomaComic, usuario.edad, key);
        actualizarProgresoComic('Historia creada. Generando imagenes...', 1, numPaneles + 1);

        // Generar imagenes para cada panel con Gemini Nano Banana
        for (let i = 0; i < comic.paneles.length; i++) {
            comic.paneles[i].imagen = await generarImagenPanel(
                comic.paneles[i].descripcionVisual,
                key,
                i + 1,
                comic.paneles.length
            );
        }

        comicActual = comic;
        mostrarComic(comic);

    } catch (error) {
        mostrarPantalla('generadorComic');
        document.getElementById('mensajeComic').innerHTML = `<span class="mensaje-error">Error: ${error.message}</span>`;
        console.error(error);
    }
}

async function generarHistoriaComic(tema, numPaneles, idioma, edad, key) {
    const idiomaNombre = { es: 'espanol', ca: 'catalan', en: 'ingles' }[idioma];

    let nivelTexto = '';
    let longitudTexto = '';
    if (edad <= 6) {
        nivelTexto = 'muy simple, frases claras';
        longitudTexto = '3-4 frases por panel';
    } else if (edad <= 8) {
        nivelTexto = 'simple pero descriptivo';
        longitudTexto = '4-5 frases por panel';
    } else if (edad <= 10) {
        nivelTexto = 'moderado, vocabulario variado';
        longitudTexto = '5-6 frases por panel, parrafos descriptivos';
    } else {
        nivelTexto = 'rico en vocabulario y detalle';
        longitudTexto = '6-8 frases por panel, narrativa inmersiva';
    }

    const prompt = `Eres un escritor de cuentos infantiles. Crea un CUENTO ILUSTRADO en ${idiomaNombre} sobre "${tema}" para un nino de ${edad} anos.

FORMATO: Cuento dividido en ${numPaneles} paginas/escenas ilustradas.
ESTILO: Narrativa tipo LIBRO DE CUENTOS, NO comic. Texto rico y descriptivo.
NIVEL: ${nivelTexto}
LONGITUD: ${longitudTexto}

Responde SOLO con JSON:
{
    "titulo": "Titulo creativo del cuento",
    "paneles": [
        {
            "numero": 1,
            "texto": "Parrafo narrativo completo con descripcion del escenario, acciones de los personajes, dialogos y emociones. Debe ser suficientemente largo para que el nino practique lectura.",
            "descripcionVisual": "Descripcion detallada de la ilustracion: personajes, escenario, colores, ambiente, expresiones faciales"
        }
    ]
}

REQUISITOS DEL TEXTO:
- Cada panel debe tener UN PARRAFO COMPLETO (minimo ${longitudTexto})
- Incluye DIALOGOS entre personajes con comillas
- Describe EMOCIONES y SENSACIONES
- Usa ADJETIVOS y descripciones vividas
- Crea una historia con INICIO emocionante, DESARROLLO con conflicto, y FINAL satisfactorio
- Los personajes deben tener NOMBRES propios

REQUISITOS DE LA DESCRIPCION VISUAL:
- Describe la ESCENA completa
- Menciona COLORES y AMBIENTE (dia/noche, interior/exterior)
- Describe las EXPRESIONES de los personajes
- Incluye DETALLES del entorno

Escribe en ${idiomaNombre}. RESPONDE SOLO CON JSON VALIDO.`;

    // FORZAR Claude (Gemini tiene cuota muy limitada en free tier)
    console.log('Generando historia del cuento con Claude...');
    return await generarTextoClaude(prompt, configIA.keys.claude);
}

async function generarImagenPanel(descripcion, key, panelNum, totalPaneles) {
    // Actualizar progreso
    actualizarProgresoComic(`Generando imagen ${panelNum}/${totalPaneles}...`, panelNum, totalPaneles);

    // Intentar generar con Gemini Imagen
    const geminiKey = configIA.keys.gemini;
    if (geminiKey) {
        try {
            console.log(`Generando imagen ${panelNum} con Gemini Imagen...`);

            // Prompt optimizado para ilustracion infantil
            const prompt = `Children's book illustration: ${descripcion}. Style: colorful, friendly, cartoon, watercolor, suitable for kids, no text.`;

            // Usar modelo Nano Banana (gemini-2.5-flash-image) para generar imagenes
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' + geminiKey, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseModalities: ["image"]
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Respuesta Gemini:', JSON.stringify(data).substring(0, 200));
                // Buscar la imagen en la respuesta
                if (data.candidates && data.candidates[0]?.content?.parts) {
                    for (const part of data.candidates[0].content.parts) {
                        if (part.inlineData) {
                            console.log(`Imagen ${panelNum} generada con exito!`);
                            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        }
                    }
                }
                console.warn('Respuesta sin imagen:', data);
            } else {
                const errorText = await response.text();
                console.warn(`Gemini imagen error (${response.status}):`, errorText);
            }
        } catch (error) {
            console.warn('Error generando imagen con Gemini:', error);
        }
    }

    // Fallback: placeholder colorido
    console.log(`Usando placeholder para imagen ${panelNum}`);
    return generarPlaceholderColor(panelNum - 1);
}

function actualizarProgresoComic(mensaje, actual, total) {
    const progresoEl = document.getElementById('progresoComic');
    if (progresoEl) {
        const porcentaje = Math.round((actual / total) * 100);
        progresoEl.innerHTML = `
            ${mensaje}
            <div style="margin-top:15px; background:rgba(255,255,255,0.2); border-radius:10px; height:20px; overflow:hidden;">
                <div style="background:linear-gradient(90deg, #00c9ff, #92fe9d); height:100%; width:${porcentaje}%; transition:width 0.3s;"></div>
            </div>
            <div style="margin-top:5px; font-size:0.9em;">${porcentaje}%</div>
        `;
    }
}

function generarPlaceholder(descripcion) {
    const hash = descripcion.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    const hue = Math.abs(hash) % 360;
    const color = `hsl(${hue}, 70%, 80%)`;

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
            <rect width="200" height="150" fill="${color}"/>
            <text x="100" y="75" text-anchor="middle" fill="#333" font-size="12" font-family="Arial">🖼️</text>
        </svg>
    `;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// Variables para navegacion del libro
let paginaActualLibro = 0;
let touchStartX = 0;

function mostrarComic(comic) {
    comicActual = comic;
    paginaActualLibro = 0;

    document.getElementById('tituloComic').textContent = comic.titulo;

    const container = document.getElementById('panelessComic');
    container.innerHTML = `
        <div class="libro-container" id="libroContainer">
            <div class="libro-pagina" id="paginaLibro">
                <!-- Se llena dinamicamente -->
            </div>
            <div class="libro-navegacion">
                <button class="libro-btn" id="btnAnterior" onclick="paginaAnterior()">◀ Anterior</button>
                <span class="libro-contador" id="contadorPaginas">1 / ${comic.paneles.length}</span>
                <button class="libro-btn" id="btnSiguiente" onclick="paginaSiguiente()">Siguiente ▶</button>
            </div>
        </div>
    `;

    // Añadir estilos del libro
    if (!document.getElementById('estilosLibro')) {
        const estilos = document.createElement('style');
        estilos.id = 'estilosLibro';
        estilos.textContent = `
            .libro-container {
                max-width: 500px;
                margin: 0 auto;
                touch-action: pan-y;
            }
            .libro-pagina {
                background: #fffef5;
                border-radius: 8px;
                padding: 15px;
                height: 65vh;
                max-height: 500px;
                overflow-y: auto;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                transition: transform 0.3s ease;
                position: relative;
            }
            .libro-pagina.swipe-left {
                transform: translateX(-20px);
                opacity: 0.7;
            }
            .libro-pagina.swipe-right {
                transform: translateX(20px);
                opacity: 0.7;
            }
            .libro-pagina img {
                width: 100%;
                height: 200px;
                object-fit: cover;
                border-radius: 8px;
                margin-bottom: 12px;
                background: #e8e8e8;
            }
            .libro-pagina .texto-pagina {
                color: #333;
                font-size: 1em;
                line-height: 1.6;
                text-align: left;
                font-family: 'Georgia', serif;
                padding: 0 5px;
            }
            .libro-pagina .numero-pagina {
                position: absolute;
                bottom: 10px;
                right: 15px;
                color: #999;
                font-size: 0.9em;
            }
            .libro-navegacion {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 15px;
                padding: 10px;
            }
            .libro-btn {
                background: rgba(255,255,255,0.2);
                border: 2px solid rgba(255,255,255,0.4);
                color: #f0f0e8;
                padding: 10px 20px;
                border-radius: 20px;
                font-family: 'Indie Flower', cursive;
                cursor: pointer;
                transition: all 0.2s;
            }
            .libro-btn:hover {
                background: rgba(255,255,255,0.3);
            }
            .libro-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }
            .libro-contador {
                color: #f0f0e8;
                font-size: 1em;
            }
        `;
        document.head.appendChild(estilos);
    }

    // Configurar swipe
    const libroContainer = document.getElementById('libroContainer');
    libroContainer.addEventListener('touchstart', handleTouchStart, {passive: true});
    libroContainer.addEventListener('touchend', handleTouchEnd, {passive: true});

    mostrarPaginaLibro(0);
    mostrarPantalla('vistaComic');
}

function mostrarPaginaLibro(idx) {
    if (!comicActual || idx < 0 || idx >= comicActual.paneles.length) return;

    paginaActualLibro = idx;
    const panel = comicActual.paneles[idx];
    const pagina = document.getElementById('paginaLibro');

    // Crear imagen con mejor manejo de errores
    const imgUrl = panel.imagen || generarPlaceholderColor(idx);
    const fallbackUrl = generarPlaceholderColor(idx);

    pagina.innerHTML = `
        <img src="${imgUrl}" alt="Ilustracion pagina ${idx + 1}"
             onerror="this.onerror=null; this.src='${fallbackUrl}';"
             style="background: linear-gradient(135deg, hsl(${idx * 60}, 70%, 85%), hsl(${idx * 60 + 30}, 70%, 90%));">
        <div class="texto-pagina">${panel.texto}</div>
        <div class="numero-pagina">${idx + 1}</div>
    `;

    // Actualizar contador y botones de navegacion
    const contador = document.getElementById('contadorPaginas');
    const btnAnterior = document.getElementById('btnAnterior');
    const btnSiguiente = document.getElementById('btnSiguiente');

    if (contador) contador.textContent = `${idx + 1} / ${comicActual.paneles.length}`;
    if (btnAnterior) btnAnterior.disabled = (idx === 0);
    if (btnSiguiente) btnSiguiente.disabled = (idx === comicActual.paneles.length - 1);
}

function generarPlaceholderColor(idx) {
    const hue = (idx * 60) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:hsl(${hue},70%,85%)"/><stop offset="100%" style="stop-color:hsl(${hue + 30},70%,90%)"/></linearGradient></defs><rect fill="url(#g)" width="512" height="400"/><circle cx="256" cy="180" r="40" fill="rgba(255,255,255,0.5)"/><text x="256" y="195" text-anchor="middle" fill="#555" font-size="32">${idx + 1}</text></svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function paginaSiguiente() {
    if (paginaActualLibro < comicActual.paneles.length - 1) {
        const pagina = document.getElementById('paginaLibro');
        pagina.classList.add('swipe-left');
        setTimeout(() => {
            mostrarPaginaLibro(paginaActualLibro + 1);
            pagina.classList.remove('swipe-left');
        }, 150);
    }
}

function paginaAnterior() {
    if (paginaActualLibro > 0) {
        const pagina = document.getElementById('paginaLibro');
        pagina.classList.add('swipe-right');
        setTimeout(() => {
            mostrarPaginaLibro(paginaActualLibro - 1);
            pagina.classList.remove('swipe-right');
        }, 150);
    }
}

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
}

function handleTouchEnd(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    // Swipe minimo de 50px
    if (Math.abs(diff) > 50) {
        if (diff > 0) {
            paginaSiguiente(); // Swipe izquierda = siguiente
        } else {
            paginaAnterior(); // Swipe derecha = anterior
        }
    }
}

function iniciarLecturaComic() {
    if (!comicActual) return;

    // Extraer texto de todos los paneles
    textoActual = comicActual.paneles.map(p => p.texto).join(' ');
    origenLectura = 'comic';
    prepararLectura(textoActual);
}

// ==================== PROCESAMIENTO PDF ====================
async function procesarPDF(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('pdfInfo').innerHTML = '⏳ Procesando PDF...';

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let textoCompleto = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            textoCompleto += pageText + ' ';
        }

        textoPDF = textoCompleto.trim();

        if (textoPDF.length < 10) {
            document.getElementById('pdfInfo').innerHTML = '<span class="mensaje-error">No se pudo extraer texto del PDF</span>';
            return;
        }

        // Mostrar preview
        document.getElementById('pdfInfo').innerHTML = `✅ PDF cargado: ${file.name} (${pdf.numPages} paginas)`;
        document.getElementById('pdfTextoPreview').textContent = textoPDF.substring(0, 500) + (textoPDF.length > 500 ? '...' : '');
        document.getElementById('pdfPreview').style.display = 'block';

    } catch (error) {
        document.getElementById('pdfInfo').innerHTML = `<span class="mensaje-error">Error al procesar PDF: ${error.message}</span>`;
        console.error(error);
    }
}

function iniciarLecturaPDF() {
    if (!textoPDF) return;
    textoActual = textoPDF;
    origenLectura = 'pdf';
    prepararLectura(textoActual);
}

// ==================== SISTEMA DE LECTURA ====================
function prepararLectura(texto) {
    // Dividir en frases
    frases = texto
        .replace(/([.!?])\s+/g, '$1|')
        .split('|')
        .map(f => f.trim())
        .filter(f => f.length > 0);

    // Crear HTML con frases marcadas
    const container = document.getElementById('textoLectura');
    container.innerHTML = frases.map((frase, idx) =>
        `<span class="frase" data-idx="${idx}">${frase}</span> `
    ).join('');

    // Reset estado
    fraseActualIdx = 0;
    lecturaEnCurso = false;
    frasesLeidas = 0;
    tiempoInicioLectura = null;

    // Reset UI
    document.getElementById('btnTerminar').style.display = 'none';
    document.getElementById('iconoLectura').textContent = '▶️';
    document.getElementById('textoBotonLectura').textContent = 'Iniciar';
    actualizarVelocidad();

    mostrarPantalla('lecturaActiva');
}

function actualizarVelocidad() {
    velocidadSegundos = parseInt(document.getElementById('velocidadLectura').value);
    document.getElementById('valorVelocidad').textContent = velocidadSegundos + 's';
}

function toggleLectura() {
    if (lecturaEnCurso) {
        pausarLectura();
    } else {
        iniciarLectura();
    }
}

function iniciarLectura() {
    if (fraseActualIdx >= frases.length) {
        reiniciarLectura();
    }

    lecturaEnCurso = true;
    tiempoInicioLectura = tiempoInicioLectura || Date.now();

    document.getElementById('iconoLectura').textContent = '⏸️';
    document.getElementById('textoBotonLectura').textContent = 'Pausar';

    marcarFraseActiva();
    avanzarLectura();
}

function pausarLectura() {
    lecturaEnCurso = false;
    clearInterval(lecturaInterval);

    document.getElementById('iconoLectura').textContent = '▶️';
    document.getElementById('textoBotonLectura').textContent = 'Continuar';
}

function detenerLectura() {
    lecturaEnCurso = false;
    clearInterval(lecturaInterval);
}

function avanzarLectura() {
    lecturaInterval = setInterval(() => {
        if (!lecturaEnCurso) return;

        // Marcar frase actual como leida
        const fraseAnterior = document.querySelector(`.frase[data-idx="${fraseActualIdx}"]`);
        if (fraseAnterior) {
            fraseAnterior.classList.remove('activa');
            fraseAnterior.classList.add('leida');
        }

        frasesLeidas++;
        fraseActualIdx++;

        if (fraseActualIdx >= frases.length) {
            // Lectura completada
            clearInterval(lecturaInterval);
            lecturaEnCurso = false;
            document.getElementById('iconoLectura').textContent = '✅';
            document.getElementById('textoBotonLectura').textContent = 'Completado';
            document.getElementById('btnTerminar').style.display = 'block';
        } else {
            marcarFraseActiva();
        }
    }, velocidadSegundos * 1000);
}

function marcarFraseActiva() {
    // Quitar marca anterior
    document.querySelectorAll('.frase.activa').forEach(f => f.classList.remove('activa'));

    // Marcar nueva frase
    const frase = document.querySelector(`.frase[data-idx="${fraseActualIdx}"]`);
    if (frase) {
        frase.classList.add('activa');
        // Scroll suave hacia la frase
        frase.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function reiniciarLectura() {
    detenerLectura();
    fraseActualIdx = 0;
    frasesLeidas = 0;
    tiempoInicioLectura = null;

    document.querySelectorAll('.frase').forEach(f => {
        f.classList.remove('activa', 'leida');
    });

    document.getElementById('iconoLectura').textContent = '▶️';
    document.getElementById('textoBotonLectura').textContent = 'Iniciar';
    document.getElementById('btnTerminar').style.display = 'none';
}

// ==================== GRABACION DE VOZ ====================
// Web Speech API para transcripcion en tiempo real
let reconocimiento = null;
let transcripcionEnVivo = '';
let usarWebSpeech = true; // Preferir Web Speech API

async function toggleGrabacion() {
    if (grabando) {
        detenerGrabacion();
    } else {
        iniciarGrabacion();
    }
}

// Verificar si Web Speech API esta disponible
function webSpeechDisponible() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

async function iniciarGrabacion() {
    try {
        // Intentar Web Speech API primero (transcripcion en tiempo real)
        if (usarWebSpeech && webSpeechDisponible()) {
            iniciarWebSpeech();
        }

        // Tambien grabar audio como backup (para Groq si falla Web Speech)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        grabando = true;
        transcripcionEnVivo = '';

        // UI
        document.getElementById('btnGrabar').classList.add('grabando');
        document.getElementById('textoBotonGrabar').textContent = 'Detener';
        document.getElementById('indicadorGrabacion').classList.add('activo');

        // Mostrar area de transcripcion en vivo
        mostrarTranscripcionEnVivo();

        // Timer
        tiempoGrabacionSegundos = 0;
        actualizarTiempoGrabacion();
        tiempoGrabacionInterval = setInterval(actualizarTiempoGrabacion, 1000);

    } catch (error) {
        alert('No se pudo acceder al microfono: ' + error.message);
        console.error(error);
    }
}

function iniciarWebSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    reconocimiento = new SpeechRecognition();

    // Configuracion
    reconocimiento.continuous = true;
    reconocimiento.interimResults = true;
    reconocimiento.maxAlternatives = 1;

    // Idioma segun el comic
    const lang = idiomaComic === 'en' ? 'en-US' : idiomaComic === 'ca' ? 'ca-ES' : 'es-ES';
    reconocimiento.lang = lang;

    reconocimiento.onresult = (event) => {
        let textoFinal = '';
        let textoInterim = '';

        for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                textoFinal += transcript + ' ';
            } else {
                textoInterim += transcript;
            }
        }

        transcripcionEnVivo = textoFinal + textoInterim;
        actualizarTranscripcionEnVivo();
    };

    reconocimiento.onerror = (event) => {
        console.warn('Web Speech error:', event.error);
        // No mostrar error si es "no-speech" (silencio)
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.log('Usando Groq como fallback');
        }
    };

    reconocimiento.onend = () => {
        // Reiniciar si aun estamos grabando
        if (grabando && reconocimiento) {
            try {
                reconocimiento.start();
            } catch (e) {
                // Ignorar error si ya esta corriendo
            }
        }
    };

    try {
        reconocimiento.start();
        console.log('Web Speech iniciado - idioma:', lang);
    } catch (e) {
        console.warn('Error iniciando Web Speech:', e);
    }
}

function mostrarTranscripcionEnVivo() {
    // Crear contenedor de transcripcion en vivo si no existe
    let container = document.getElementById('transcripcionEnVivo');
    if (!container) {
        container = document.createElement('div');
        container.id = 'transcripcionEnVivo';
        container.style.cssText = 'background:rgba(0,0,0,0.3);border:2px solid rgba(255,255,255,0.3);border-radius:10px;padding:10px;margin:10px 0;max-height:100px;overflow-y:auto;font-size:0.95em;color:#90EE90;';
        container.innerHTML = '<div style="opacity:0.7;font-size:0.9em;margin-bottom:5px;">Transcripcion en vivo:</div><div id="textoTranscripcion" style="font-style:italic;min-height:20px;">Esperando...</div>';

        // Insertar antes de los controles
        const controles = document.querySelector('.controles-lectura');
        if (controles) {
            controles.parentNode.insertBefore(container, controles);
        }
    }
    container.style.display = 'block';
}

function actualizarTranscripcionEnVivo() {
    const textoEl = document.getElementById('textoTranscripcion');
    if (textoEl) {
        textoEl.textContent = transcripcionEnVivo || 'Escuchando...';
        textoEl.parentNode.scrollTop = textoEl.parentNode.scrollHeight;
    }
}

function ocultarTranscripcionEnVivo() {
    const container = document.getElementById('transcripcionEnVivo');
    if (container) {
        container.style.display = 'none';
    }
}

function detenerGrabacion() {
    if (mediaRecorder && grabando) {
        mediaRecorder.stop();
        grabando = false;

        // Detener Web Speech
        if (reconocimiento) {
            try {
                reconocimiento.stop();
            } catch (e) {}
            reconocimiento = null;
        }

        clearInterval(tiempoGrabacionInterval);

        // UI
        document.getElementById('btnGrabar').classList.remove('grabando');
        document.getElementById('textoBotonGrabar').textContent = 'Grabar voz';
        document.getElementById('indicadorGrabacion').classList.remove('activo');
    }
}

function actualizarTiempoGrabacion() {
    tiempoGrabacionSegundos++;
    const mins = Math.floor(tiempoGrabacionSegundos / 60).toString().padStart(2, '0');
    const secs = (tiempoGrabacionSegundos % 60).toString().padStart(2, '0');
    document.getElementById('tiempoGrabacion').textContent = `${mins}:${secs}`;
}

// ==================== TEXT-TO-SPEECH ====================
let leyendoEnVoz = false;
let speechSynthesis = window.speechSynthesis;

function leerEnVozAlta() {
    if (leyendoEnVoz) {
        detenerLecturaVoz();
        return;
    }

    if (!speechSynthesis) {
        alert('Tu navegador no soporta lectura en voz alta');
        return;
    }

    // Obtener texto de la frase actual o todo el texto
    let textoALeer = '';
    const fraseActiva = document.querySelector('.frase.activa');
    if (fraseActiva) {
        textoALeer = fraseActiva.textContent;
    } else {
        textoALeer = textoActual.substring(0, 500); // Primeras 500 chars
    }

    const utterance = new SpeechSynthesisUtterance(textoALeer);

    // Configurar idioma
    const lang = idiomaComic === 'en' ? 'en-US' : idiomaComic === 'ca' ? 'ca-ES' : 'es-ES';
    utterance.lang = lang;
    utterance.rate = 0.85; // Un poco mas lento para ninos
    utterance.pitch = 1;

    utterance.onend = () => {
        leyendoEnVoz = false;
        actualizarBotonLeerVoz();
    };

    utterance.onerror = (e) => {
        console.error('Error TTS:', e);
        leyendoEnVoz = false;
        actualizarBotonLeerVoz();
    };

    speechSynthesis.speak(utterance);
    leyendoEnVoz = true;
    actualizarBotonLeerVoz();
}

function detenerLecturaVoz() {
    if (speechSynthesis) {
        speechSynthesis.cancel();
    }
    leyendoEnVoz = false;
    actualizarBotonLeerVoz();
}

function actualizarBotonLeerVoz() {
    const btn = document.getElementById('btnLeerVoz');
    if (btn) {
        btn.textContent = leyendoEnVoz ? '⏹️ Parar' : '🔊 Escuchar';
    }
}

// ==================== EVALUACION ====================
async function terminarLectura() {
    detenerLectura();
    detenerGrabacion();
    ocultarTranscripcionEnVivo();

    mostrarPantalla('evaluacion');
    document.getElementById('evaluandoMsg').style.display = 'block';
    document.getElementById('resultadoEvaluacion').style.display = 'none';

    const tiempoTotal = tiempoInicioLectura ? Math.round((Date.now() - tiempoInicioLectura) / 1000) : 0;

    try {
        let transcripcion = null;

        // Usar transcripcion de Web Speech si esta disponible (instantanea)
        if (transcripcionEnVivo && transcripcionEnVivo.trim().length > 10) {
            console.log('Usando transcripcion de Web Speech');
            transcripcion = transcripcionEnVivo.trim();
        }
        // Fallback a Groq si no hay transcripcion de Web Speech
        else if (audioBlob && configIA.keys.groq) {
            document.getElementById('evaluandoMsg').querySelector('p').textContent = 'Transcribiendo tu voz con IA...';
            transcripcion = await transcribirConGroq(audioBlob);
        }

        const key = configIA.keys[configIA.provider];

        if (!key) {
            mostrarResultadoBasico(tiempoTotal, transcripcion);
            return;
        }

        document.getElementById('evaluandoMsg').querySelector('p').textContent = 'Evaluando tu lectura...';
        const evaluacion = await evaluarLecturaConIA(tiempoTotal, key, transcripcion);
        mostrarResultadoEvaluacion(evaluacion, tiempoTotal, transcripcion);

    } catch (error) {
        console.error('Error en evaluacion:', error);
        mostrarResultadoBasico(tiempoTotal, null);
    }
}

// Transcribir audio con Groq Whisper
async function transcribirConGroq(audioBlob) {
    const groqKey = configIA.keys.groq;
    if (!groqKey) return null;

    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'grabacion.webm');
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('response_format', 'json');

        // Detectar idioma segun el comic
        const lang = idiomaComic === 'en' ? 'en' : idiomaComic === 'ca' ? 'ca' : 'es';
        formData.append('language', lang);

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqKey}`
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            return data.text;
        } else {
            console.error('Error Groq:', await response.text());
            return null;
        }
    } catch (error) {
        console.error('Error transcribiendo:', error);
        return null;
    }
}

async function evaluarLecturaConIA(tiempoTotal, key, transcripcion) {
    const guardado = localStorage.getItem('usuarioAprendizaje');
    const usuario = guardado ? JSON.parse(guardado) : { nombre: 'Estudiante', edad: 10 };

    // Construir prompt con o sin transcripcion
    let datosTranscripcion = '';
    if (transcripcion) {
        datosTranscripcion = `
- TRANSCRIPCION DE VOZ (lo que el estudiante leyo en voz alta):
"${transcripcion}"

IMPORTANTE: Compara la transcripcion con el texto original para evaluar:
- Precision: ¿Leyo correctamente las palabras?
- Fluidez: ¿Se nota que leyo con ritmo natural?
- Omisiones: ¿Salto alguna palabra o frase?
- Sustituciones: ¿Cambio alguna palabra por otra?`;
    }

    const prompt = `Eres un profesor de lectura evaluando a un estudiante llamado ${usuario.nombre} de ${usuario.edad} anos.

DATOS DE LA SESION:
- Texto original a leer: "${textoActual.substring(0, 800)}..."
- Total de frases: ${frases.length}
- Frases completadas: ${frasesLeidas}
- Tiempo total: ${tiempoTotal} segundos
- Tiempo promedio por frase: ${Math.round(tiempoTotal / Math.max(frasesLeidas, 1))} segundos
- Velocidad configurada: ${velocidadSegundos} segundos por frase
${datosTranscripcion}

Evalua la sesion de lectura y responde SOLO con un JSON asi:
{
    "puntuacion": 85,
    "velocidad": "adecuada|lenta|rapida",
    "precision_lectura": ${transcripcion ? '"alta|media|baja"' : 'null'},
    "palabras_correctas": ${transcripcion ? '"X de Y palabras"' : 'null'},
    "comprension_estimada": "buena|media|baja",
    "feedback": "Mensaje personalizado y motivador para el estudiante (2-3 oraciones)",
    "consejos": ["Consejo 1", "Consejo 2"],
    "errores_detectados": ${transcripcion ? '["error 1", "error 2"]' : '[]'}
}

La puntuacion debe ser de 0 a 100 basada en:
${transcripcion ? '- Precision al leer (comparar transcripcion con texto original)\n- Fluidez y ritmo' : '- Completar todas las frases'}
- Mantener un ritmo adecuado para su edad (${usuario.edad} anos)
- Consistencia en la lectura`;

    // FORZAR Claude para evaluacion
    console.log('Evaluando lectura con Claude...');
    return await generarTextoClaude(prompt, configIA.keys.claude);
}

function mostrarResultadoEvaluacion(evaluacion, tiempoTotal, transcripcion) {
    document.getElementById('evaluandoMsg').style.display = 'none';
    document.getElementById('resultadoEvaluacion').style.display = 'block';

    // Emoji segun puntuacion
    let emoji = '📚';
    if (evaluacion.puntuacion >= 90) emoji = '🏆';
    else if (evaluacion.puntuacion >= 70) emoji = '⭐';
    else if (evaluacion.puntuacion >= 50) emoji = '👍';

    document.getElementById('puntuacionFinal').textContent = `${emoji} ${evaluacion.puntuacion}/100`;

    // Detalles
    const mins = Math.floor(tiempoTotal / 60);
    const secs = tiempoTotal % 60;
    let detallesHTML = `
        <div class="detalle-item">
            <span>Frases leidas:</span>
            <span>${frasesLeidas} de ${frases.length}</span>
        </div>
        <div class="detalle-item">
            <span>Tiempo total:</span>
            <span>${mins}m ${secs}s</span>
        </div>
        <div class="detalle-item">
            <span>Velocidad:</span>
            <span>${evaluacion.velocidad}</span>
        </div>
    `;

    // Mostrar precision si hubo transcripcion
    if (transcripcion && evaluacion.precision_lectura) {
        detallesHTML += `
            <div class="detalle-item" style="border-top:1px solid rgba(255,255,255,0.2); margin-top:8px; padding-top:8px;">
                <span>🎤 Precision lectura:</span>
                <span>${evaluacion.precision_lectura}</span>
            </div>
        `;
        if (evaluacion.palabras_correctas) {
            detallesHTML += `
                <div class="detalle-item">
                    <span>Palabras correctas:</span>
                    <span>${evaluacion.palabras_correctas}</span>
                </div>
            `;
        }
    }

    detallesHTML += `
        <div class="detalle-item">
            <span>Comprension estimada:</span>
            <span>${evaluacion.comprension_estimada}</span>
        </div>
    `;

    document.getElementById('detallesEvaluacion').innerHTML = detallesHTML;

    // Feedback
    let feedbackHTML = `<p><strong>💬 Feedback:</strong> ${evaluacion.feedback}</p>`;

    // Mostrar errores detectados si los hay
    if (evaluacion.errores_detectados && evaluacion.errores_detectados.length > 0) {
        feedbackHTML += '<p><strong>📝 Errores detectados:</strong></p><ul style="color:#ffaa66;">';
        evaluacion.errores_detectados.forEach(e => {
            feedbackHTML += `<li>${e}</li>`;
        });
        feedbackHTML += '</ul>';
    }

    if (evaluacion.consejos && evaluacion.consejos.length > 0) {
        feedbackHTML += '<p><strong>💡 Consejos:</strong></p><ul>';
        evaluacion.consejos.forEach(c => {
            feedbackHTML += `<li>${c}</li>`;
        });
        feedbackHTML += '</ul>';
    }

    // Mostrar transcripcion si existe
    if (transcripcion) {
        feedbackHTML += `
            <details style="margin-top:15px;">
                <summary style="cursor:pointer; color:#87CEEB;">🎤 Ver transcripcion de tu voz</summary>
                <p style="margin-top:10px; padding:10px; background:rgba(0,0,0,0.2); border-radius:8px; font-style:italic;">
                    "${transcripcion}"
                </p>
            </details>
        `;
    }

    document.getElementById('feedbackIA').innerHTML = feedbackHTML;
}

function mostrarResultadoBasico(tiempoTotal, transcripcion) {
    document.getElementById('evaluandoMsg').style.display = 'none';
    document.getElementById('resultadoEvaluacion').style.display = 'block';

    const porcentaje = Math.round((frasesLeidas / frases.length) * 100);
    let emoji = '📚';
    if (porcentaje >= 90) emoji = '🏆';
    else if (porcentaje >= 70) emoji = '⭐';

    document.getElementById('puntuacionFinal').textContent = `${emoji} ${porcentaje}%`;

    const mins = Math.floor(tiempoTotal / 60);
    const secs = tiempoTotal % 60;
    document.getElementById('detallesEvaluacion').innerHTML = `
        <div class="detalle-item">
            <span>Frases leidas:</span>
            <span>${frasesLeidas} de ${frases.length}</span>
        </div>
        <div class="detalle-item">
            <span>Tiempo total:</span>
            <span>${mins}m ${secs}s</span>
        </div>
    `;

    let feedbackHTML = `<p>¡Buen trabajo completando la lectura!</p>`;

    if (transcripcion) {
        feedbackHTML += `
            <details style="margin-top:15px;">
                <summary style="cursor:pointer; color:#87CEEB;">🎤 Ver transcripcion de tu voz</summary>
                <p style="margin-top:10px; padding:10px; background:rgba(0,0,0,0.2); border-radius:8px; font-style:italic;">
                    "${transcripcion}"
                </p>
            </details>
        `;
    }

    document.getElementById('feedbackIA').innerHTML = feedbackHTML;
}
