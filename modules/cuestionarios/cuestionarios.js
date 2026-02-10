let temaActual = null;
let cuestionarioActual = null;
let preguntaActualIdx = 0;
let puntuacionCuest = 0;
let fotosSubidas = [];
let juegoActual = null;
let estadoJuego = {};

// Inicializar configuracion al cargar
document.addEventListener('DOMContentLoaded', () => {
    cargarConfiguracion();
    // Usar Gemini para cuestionarios
    configIA.provider = 'gemini';
    console.log('Cuestionarios usando proveedor:', configIA.provider);
});

function limpiarTemas() {
    if (confirm('¿Seguro que quieres borrar todos los temas guardados?')) {
        localStorage.removeItem('temas');
        alert('Temas borrados correctamente');
    }
}

function nuevoCuestionario() {
    mostrarPantalla('nuevoCuestionario');
    fotosSubidas = [];
    document.getElementById('previsualizacion').innerHTML = '';
    document.getElementById('nombreTema').value = '';
    document.getElementById('btnGenerar').style.display = 'none';
    document.getElementById('estadoGeneracion').innerHTML = '';
}

function procesarFotos(event) {
    const files = event.target.files;
    const preview = document.getElementById('previsualizacion');

    for (let file of files) {
        const reader = new FileReader();
        reader.onload = function(e) {
            fotosSubidas.push(e.target.result);
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-foto';
            preview.appendChild(img);
            actualizarBotonGenerar();
        };
        reader.readAsDataURL(file);
    }
}

function abrirCamara() {
    const input = document.getElementById('inputFotos');
    input.setAttribute('capture', 'environment');
    input.click();
}

function actualizarBotonGenerar() {
    const nombre = document.getElementById('nombreTema').value.trim();
    const btn = document.getElementById('btnGenerar');
    if (fotosSubidas.length > 0 && nombre) {
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
    }
}

async function generarContenido() {
    const nombre = document.getElementById('nombreTema').value.trim();
    const estado = document.getElementById('estadoGeneracion');

    // Usar Gemini para cuestionarios
    const provider = 'gemini';
    const key = configIA.keys.gemini;

    console.log('Generando cuestionario con:', provider, 'Key existe:', !!key);

    if (!key) {
        estado.innerHTML = '❌ No hay API key de Gemini configurada';
        return;
    }

    estado.innerHTML = '⏳ Analizando imagenes con IA...';

    try {
        const contenidoIA = await generarContenidoConIA(nombre, fotosSubidas, key);

        const nuevoTema = {
            id: Date.now(),
            nombre: nombre,
            fechaCreacion: new Date().toLocaleDateString(),
            // No guardamos las imagenes para ahorrar espacio en localStorage
            imagenes: [],
            cuestionario: contenidoIA.cuestionario,
            juego: contenidoIA.juego,
            lectura: contenidoIA.lectura
        };

        guardarTema(nuevoTema);
        estado.innerHTML = '✅ ¡Tema creado! Cuestionario, juego y lectura generados.';

        setTimeout(() => {
            temaActual = nuevoTema;
            mostrarDetalleTema();
        }, 1500);

    } catch (error) {
        estado.innerHTML = '❌ Error: ' + error.message;
        console.error(error);
    }
}

async function generarContenidoConIA(nombre, imagenes, key) {
    const prompt = `TAREA: Analiza DETALLADAMENTE estas imagenes de un libro de texto escolar sobre "${nombre}".

INSTRUCCIONES CRITICAS:
1. EXTRAE toda la informacion visible en las imagenes: textos, datos, nombres, fechas, conceptos, definiciones
2. Las preguntas DEBEN ser sobre el contenido ESPECIFICO que aparece en las imagenes
3. NO inventes informacion que no este en las imagenes
4. Usa los terminos EXACTOS que aparecen en el material

Genera un JSON con esta estructura EXACTA:

{
  "cuestionario": [
    {
      "pregunta": "Segun el texto, ¿cual es la definicion de [termino que aparece en la imagen]?",
      "opciones": ["Definicion correcta del texto", "Opcion incorrecta plausible", "Otra opcion incorrecta", "Otra opcion incorrecta"],
      "correcta": 0
    }
  ],
  "lectura": "Resumen del contenido REAL de las imagenes adaptado para ninos de 8-12 anos...",
  "juego": {
    "tipo": "relacionar",
    "titulo": "Titulo basado en el tema",
    "instrucciones": "Une cada elemento con su definicion correcta",
    "elementos": [
      {"izq": "Termino 1", "der": "Definicion 1"},
      {"izq": "Termino 2", "der": "Definicion 2"},
      {"izq": "Termino 3", "der": "Definicion 3"},
      {"izq": "Termino 4", "der": "Definicion 4"}
    ]
  }
}

REQUISITOS DEL CUESTIONARIO:
- Genera EXACTAMENTE 10 preguntas
- Cada pregunta debe referirse a informacion VISIBLE en las imagenes
- Incluye preguntas sobre: definiciones, datos especificos, relaciones entre conceptos
- El campo "correcta" es el INDICE (0, 1, 2 o 3) de la respuesta correcta
- Las opciones incorrectas deben ser plausibles pero claramente diferentes

REQUISITOS DEL JUEGO (tipo "relacionar"):
- El array "elementos" debe tener entre 4 y 6 pares
- Cada elemento DEBE tener "izq" (termino) y "der" (definicion/descripcion)
- Usa terminos y definiciones que aparezcan en las imagenes

RESPONDE UNICAMENTE CON EL JSON VALIDO, sin texto adicional, sin markdown.`;

    // Usar Gemini para cuestionarios
    console.log('Usando Gemini para analizar imagenes...');
    return await generarConGemini(prompt, imagenes, configIA.keys.gemini);
}

function guardarTema(tema) {
    let temas = JSON.parse(localStorage.getItem('temas') || '[]');
    temas.push(tema);
    localStorage.setItem('temas', JSON.stringify(temas));
}

function listarCuestionarios() {
    mostrarPantalla('listaCuestionarios');
    const lista = document.getElementById('listaTemas');
    const temas = JSON.parse(localStorage.getItem('temas') || '[]');

    if (temas.length === 0) {
        lista.innerHTML = '<div class="no-temas">No hay temas guardados.<br>¡Crea uno nuevo!</div>';
        return;
    }

    lista.innerHTML = temas.map(tema => `
        <div class="tema-item" onclick="seleccionarTema(${tema.id})">
            <h3>📚 ${tema.nombre}</h3>
            <small>Creado: ${tema.fechaCreacion}</small>
        </div>
    `).join('');
}

function seleccionarTema(id) {
    const temas = JSON.parse(localStorage.getItem('temas') || '[]');
    temaActual = temas.find(t => t.id === id);
    if (temaActual) {
        mostrarDetalleTema();
    }
}

function mostrarDetalleTema() {
    document.getElementById('tituloTema').textContent = temaActual.nombre;
    mostrarPantalla('detalleTema');
}

function iniciarCuestionario() {
    if (!temaActual || !temaActual.cuestionario) return;

    cuestionarioActual = temaActual.cuestionario;
    preguntaActualIdx = 0;
    puntuacionCuest = 0;
    mostrarPantalla('cuestionarioActivo');
    mostrarPregunta();
}

function mostrarPregunta() {
    const q = cuestionarioActual[preguntaActualIdx];
    const container = document.getElementById('preguntaActual');
    document.getElementById('progresoCuest').textContent = `Pregunta ${preguntaActualIdx + 1} de ${cuestionarioActual.length}`;
    document.getElementById('mensajeCuest').textContent = '';

    // Ocultar boton siguiente (ahora es automatico)
    const btnSiguiente = document.getElementById('btnSiguienteCuest');
    if (btnSiguiente) btnSiguiente.style.display = 'none';

    const letras = ['A', 'B', 'C', 'D'];
    container.innerHTML = `
        <div class="pregunta-card">
            <div class="pregunta-texto">${q.pregunta}</div>
            <div class="opciones">
                ${q.opciones.map((op, i) => `
                    <div class="opcion" onclick="seleccionarOpcion(${i})">
                        <span class="opcion-letra">${letras[i]}</span>
                        <span>${op}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function seleccionarOpcion(idx) {
    const q = cuestionarioActual[preguntaActualIdx];
    const opciones = document.querySelectorAll('.opcion');

    // Deshabilitar todas las opciones
    opciones.forEach((op, i) => {
        op.onclick = null;
        op.style.cursor = 'default';
        // Siempre marcar la correcta en verde
        if (i === q.correcta) {
            op.classList.add('correcta');
        }
        // Si el usuario se equivoco, marcar su respuesta en rojo
        if (i === idx && idx !== q.correcta) {
            op.classList.add('incorrecta');
        }
    });

    const mensaje = document.getElementById('mensajeCuest');
    if (idx === q.correcta) {
        puntuacionCuest++;
        mensaje.textContent = '✅ ¡Correcto!';
        mensaje.className = 'tiza mensaje-ok';
    } else {
        mensaje.textContent = '❌ Incorrecto - La respuesta correcta era: ' + q.opciones[q.correcta];
        mensaje.className = 'tiza mensaje-error';
    }

    // Auto-avanzar despues de 1.5 segundos
    setTimeout(() => {
        preguntaActualIdx++;
        if (preguntaActualIdx >= cuestionarioActual.length) {
            mostrarResultadosCuestionario();
        } else {
            mostrarPregunta();
        }
    }, 1500);
}

function siguientePregunta() {
    preguntaActualIdx++;
    if (preguntaActualIdx >= cuestionarioActual.length) {
        mostrarResultadosCuestionario();
    } else {
        mostrarPregunta();
    }
}

function mostrarResultadosCuestionario() {
    const porcentaje = Math.round((puntuacionCuest / cuestionarioActual.length) * 100);
    const container = document.getElementById('preguntaActual');

    let emoji, mensaje;
    if (porcentaje >= 80) {
        emoji = '🏆';
        mensaje = '¡Excelente trabajo!';
    } else if (porcentaje >= 60) {
        emoji = '👍';
        mensaje = '¡Buen trabajo! Sigue practicando.';
    } else {
        emoji = '📚';
        mensaje = 'Necesitas repasar mas. ¡Tu puedes!';
    }

    container.innerHTML = `
        <div style="text-align:center;">
            <div style="font-size:4em; margin-bottom:20px;">${emoji}</div>
            <div style="font-size:1.5em; margin-bottom:10px;">Resultado: ${porcentaje}%</div>
            <div style="margin-bottom:20px;">${puntuacionCuest} de ${cuestionarioActual.length} correctas</div>
            <div style="margin-bottom:20px;">${mensaje}</div>
            <button class="btn" onclick="iniciarCuestionario()">🔄 Repetir</button>
        </div>
    `;
    document.getElementById('btnSiguienteCuest').style.display = 'none';
    document.getElementById('progresoCuest').textContent = 'Completado';
}

function verLectura() {
    if (!temaActual || !temaActual.lectura) return;

    const container = document.getElementById('preguntaActual');
    document.getElementById('progresoCuest').textContent = 'Lectura';
    document.getElementById('btnSiguienteCuest').style.display = 'none';
    document.getElementById('mensajeCuest').textContent = '';

    container.innerHTML = `
        <div style="line-height:1.8; text-align:justify;">
            ${temaActual.lectura}
        </div>
    `;
    mostrarPantalla('cuestionarioActivo');
}

// ==================== JUEGOS ====================
function iniciarJuego() {
    if (!temaActual || !temaActual.juego) {
        alert('Este tema no tiene un juego generado.');
        return;
    }

    juegoActual = temaActual.juego;
    estadoJuego = {};

    document.getElementById('juegoTitulo').textContent = juegoActual.titulo || 'Juego';
    document.getElementById('juegoInstrucciones').textContent = juegoActual.instrucciones || '';
    document.getElementById('mensajeJuego').textContent = '';
    document.getElementById('btnComprobarJuego').style.display = 'inline-block';

    const area = document.getElementById('juegoArea');

    switch (juegoActual.tipo) {
        case 'ordenar':
            renderizarJuegoOrdenar(area);
            break;
        case 'relacionar':
            renderizarJuegoRelacionar(area);
            break;
        case 'completar':
            renderizarJuegoCompletar(area);
            break;
        default:
            area.innerHTML = '<p>Tipo de juego no soportado.</p>';
    }

    mostrarPantalla('juegoActivo');
}

function renderizarJuegoOrdenar(area) {
    const elementos = [...juegoActual.elementos];
    estadoJuego.ordenCorrecto = elementos.map((_, i) => i);
    const mezclados = elementos.map((el, i) => ({ texto: el, originalIndex: i }));
    for (let i = mezclados.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mezclados[i], mezclados[j]] = [mezclados[j], mezclados[i]];
    }
    estadoJuego.ordenActual = mezclados.map(m => m.originalIndex);

    area.innerHTML = `
        <div class="ordenar-lista" id="ordenarLista">
            ${mezclados.map((el, i) => `
                <div class="ordenar-item" draggable="true" data-index="${i}"
                     ondragstart="arrastrarInicio(event)"
                     ondragover="arrastrarSobre(event)"
                     ondrop="soltar(event)"
                     ondragend="arrastrarFin(event)"
                     ontouchstart="tocarInicio(event)"
                     ontouchmove="tocarMover(event)"
                     ontouchend="tocarFin(event)">
                    <span class="ordenar-numero">${i + 1}</span>
                    <span class="ordenar-texto">${el.texto}</span>
                </div>
            `).join('')}
        </div>
    `;
}

let itemArrastrado = null;
let touchItem = null;

function arrastrarInicio(e) {
    itemArrastrado = e.target.closest('.ordenar-item');
    itemArrastrado.classList.add('arrastrando');
    e.dataTransfer.effectAllowed = 'move';
}

function arrastrarSobre(e) {
    e.preventDefault();
    const item = e.target.closest('.ordenar-item');
    if (item && item !== itemArrastrado) {
        item.classList.add('sobre');
    }
}

function arrastrarFin(e) {
    document.querySelectorAll('.ordenar-item').forEach(item => {
        item.classList.remove('arrastrando', 'sobre');
    });
}

function soltar(e) {
    e.preventDefault();
    const destino = e.target.closest('.ordenar-item');
    if (destino && itemArrastrado && destino !== itemArrastrado) {
        const lista = document.getElementById('ordenarLista');
        const items = [...lista.children];
        const indexOrigen = items.indexOf(itemArrastrado);
        const indexDestino = items.indexOf(destino);

        if (indexOrigen < indexDestino) {
            destino.after(itemArrastrado);
        } else {
            destino.before(itemArrastrado);
        }

        actualizarNumerosOrden();
        actualizarEstadoOrden();
    }
    document.querySelectorAll('.ordenar-item').forEach(item => {
        item.classList.remove('arrastrando', 'sobre');
    });
}

function tocarInicio(e) {
    touchItem = e.target.closest('.ordenar-item');
    touchItem.classList.add('arrastrando');
}

function tocarMover(e) {
    if (!touchItem) return;
    e.preventDefault();
    const touch = e.touches[0];
    const elementoDebajo = document.elementFromPoint(touch.clientX, touch.clientY);
    const itemDebajo = elementoDebajo?.closest('.ordenar-item');

    document.querySelectorAll('.ordenar-item.sobre').forEach(i => i.classList.remove('sobre'));
    if (itemDebajo && itemDebajo !== touchItem) {
        itemDebajo.classList.add('sobre');
    }
}

function tocarFin(e) {
    if (!touchItem) return;
    const touch = e.changedTouches[0];
    const elementoDebajo = document.elementFromPoint(touch.clientX, touch.clientY);
    const destino = elementoDebajo?.closest('.ordenar-item');

    if (destino && destino !== touchItem) {
        const lista = document.getElementById('ordenarLista');
        const items = [...lista.children];
        const indexOrigen = items.indexOf(touchItem);
        const indexDestino = items.indexOf(destino);

        if (indexOrigen < indexDestino) {
            destino.after(touchItem);
        } else {
            destino.before(touchItem);
        }

        actualizarNumerosOrden();
        actualizarEstadoOrden();
    }

    document.querySelectorAll('.ordenar-item').forEach(item => {
        item.classList.remove('arrastrando', 'sobre');
    });
    touchItem = null;
}

function actualizarNumerosOrden() {
    const items = document.querySelectorAll('#ordenarLista .ordenar-item');
    items.forEach((item, i) => {
        item.querySelector('.ordenar-numero').textContent = i + 1;
    });
}

function actualizarEstadoOrden() {
    const items = document.querySelectorAll('#ordenarLista .ordenar-item');
    estadoJuego.ordenActual = [...items].map(item => {
        const texto = item.querySelector('.ordenar-texto').textContent;
        return juegoActual.elementos.indexOf(texto);
    });
}

function renderizarJuegoRelacionar(area) {
    const pares = juegoActual.elementos;
    estadoJuego.paresCorrectos = pares;
    estadoJuego.emparejados = [];
    estadoJuego.seleccionIzq = null;

    const derechos = pares.map(p => p.der);
    for (let i = derechos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [derechos[i], derechos[j]] = [derechos[j], derechos[i]];
    }

    area.innerHTML = `
        <div class="relacionar-container">
            <div class="relacionar-columna" id="colIzq">
                ${pares.map((p, i) => `
                    <div class="relacionar-item" data-lado="izq" data-valor="${p.izq}" onclick="seleccionarRelacionar(this)">
                        ${p.izq}
                    </div>
                `).join('')}
            </div>
            <div class="relacionar-columna" id="colDer">
                ${derechos.map((d, i) => `
                    <div class="relacionar-item" data-lado="der" data-valor="${d}" onclick="seleccionarRelacionar(this)">
                        ${d}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function seleccionarRelacionar(elem) {
    if (elem.classList.contains('emparejado')) return;

    const lado = elem.dataset.lado;
    const valor = elem.dataset.valor;

    if (lado === 'izq') {
        document.querySelectorAll('#colIzq .relacionar-item.seleccionado')
            .forEach(e => e.classList.remove('seleccionado'));
        elem.classList.add('seleccionado');
        estadoJuego.seleccionIzq = valor;
    } else if (lado === 'der' && estadoJuego.seleccionIzq) {
        const parCorrecto = estadoJuego.paresCorrectos.find(
            p => p.izq === estadoJuego.seleccionIzq && p.der === valor
        );

        const itemIzq = document.querySelector(`#colIzq .relacionar-item[data-valor="${estadoJuego.seleccionIzq}"]`);

        if (parCorrecto) {
            itemIzq.classList.remove('seleccionado');
            itemIzq.classList.add('emparejado');
            elem.classList.add('emparejado');
            estadoJuego.emparejados.push(parCorrecto);
            estadoJuego.seleccionIzq = null;

            if (estadoJuego.emparejados.length === estadoJuego.paresCorrectos.length) {
                document.getElementById('mensajeJuego').textContent = '🎉 ¡Todos los pares encontrados!';
                document.getElementById('btnComprobarJuego').style.display = 'none';
            }
        } else {
            elem.classList.add('error');
            itemIzq.classList.add('error');
            setTimeout(() => {
                elem.classList.remove('error');
                itemIzq.classList.remove('error', 'seleccionado');
                estadoJuego.seleccionIzq = null;
            }, 500);
        }
    }
}

function renderizarJuegoCompletar(area) {
    const datos = juegoActual.elementos;
    estadoJuego.huecos = datos.huecos;
    estadoJuego.respuestasUsuario = new Array(datos.huecos.length).fill('');
    estadoJuego.huecoActivo = null;

    const opciones = datos.huecos.map(h => h.respuesta);
    for (let i = opciones.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
    }

    let textoHTML = datos.texto;
    datos.huecos.forEach((hueco, i) => {
        const marcador = `___${i}___`;
        textoHTML = textoHTML.replace(marcador,
            `<span class="completar-hueco" data-index="${i}" onclick="activarHueco(this)"></span>`);
    });

    area.innerHTML = `
        <div class="completar-texto">${textoHTML}</div>
        <div class="completar-opciones" id="opcionesCompletar">
            ${opciones.map(op => `
                <span class="completar-opcion" onclick="seleccionarOpcionCompletar(this)">${op}</span>
            `).join('')}
        </div>
    `;
}

function activarHueco(elem) {
    document.querySelectorAll('.completar-hueco.activo').forEach(h => h.classList.remove('activo'));
    elem.classList.add('activo');
    estadoJuego.huecoActivo = parseInt(elem.dataset.index);
}

function seleccionarOpcionCompletar(elem) {
    if (elem.classList.contains('usada') || estadoJuego.huecoActivo === null) return;

    const valor = elem.textContent;
    const hueco = document.querySelector(`.completar-hueco[data-index="${estadoJuego.huecoActivo}"]`);

    if (hueco.textContent) {
        const opcionAnterior = [...document.querySelectorAll('.completar-opcion')]
            .find(o => o.textContent === hueco.textContent);
        if (opcionAnterior) opcionAnterior.classList.remove('usada');
    }

    hueco.textContent = valor;
    hueco.classList.add('lleno');
    hueco.classList.remove('activo');
    elem.classList.add('usada');

    estadoJuego.respuestasUsuario[estadoJuego.huecoActivo] = valor;
    estadoJuego.huecoActivo = null;
}

function comprobarJuego() {
    switch (juegoActual.tipo) {
        case 'ordenar':
            comprobarOrdenar();
            break;
        case 'relacionar':
            comprobarRelacionar();
            break;
        case 'completar':
            comprobarCompletar();
            break;
    }
}

function comprobarOrdenar() {
    const items = document.querySelectorAll('#ordenarLista .ordenar-item');
    let correctos = 0;

    items.forEach((item, i) => {
        const texto = item.querySelector('.ordenar-texto').textContent;
        const indexOriginal = juegoActual.elementos.indexOf(texto);
        const esCorrecto = indexOriginal === i;

        item.classList.remove('correcto', 'incorrecto');
        item.classList.add(esCorrecto ? 'correcto' : 'incorrecto');

        if (esCorrecto) correctos++;
    });

    const total = juegoActual.elementos.length;
    const porcentaje = Math.round((correctos / total) * 100);
    document.getElementById('mensajeJuego').innerHTML =
        `Resultado: ${correctos}/${total} (${porcentaje}%)${porcentaje === 100 ? ' 🎉' : ''}`;
}

function comprobarRelacionar() {
    const correctos = estadoJuego.emparejados.length;
    const total = estadoJuego.paresCorrectos.length;
    const porcentaje = Math.round((correctos / total) * 100);
    document.getElementById('mensajeJuego').innerHTML =
        `Resultado: ${correctos}/${total} pares (${porcentaje}%)${porcentaje === 100 ? ' 🎉' : ''}`;
}

function comprobarCompletar() {
    const huecos = document.querySelectorAll('.completar-hueco');
    let correctos = 0;

    huecos.forEach((hueco, i) => {
        const respuestaUsuario = hueco.textContent;
        const respuestaCorrecta = estadoJuego.huecos[i].respuesta;
        const esCorrecto = respuestaUsuario === respuestaCorrecta;

        hueco.classList.remove('correcto', 'incorrecto', 'lleno');
        hueco.classList.add(esCorrecto ? 'correcto' : 'incorrecto');

        if (!esCorrecto && respuestaUsuario) {
            hueco.textContent = respuestaCorrecta;
        }

        if (esCorrecto) correctos++;
    });

    const total = estadoJuego.huecos.length;
    const porcentaje = Math.round((correctos / total) * 100);
    document.getElementById('mensajeJuego').innerHTML =
        `Resultado: ${correctos}/${total} (${porcentaje}%)${porcentaje === 100 ? ' 🎉' : ''}`;

    document.getElementById('opcionesCompletar').style.display = 'none';
}
