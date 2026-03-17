// ==================== ESTADO GLOBAL ====================
console.log('common.js cargado correctamente');
console.log('[DEBUG] localStorage disponible:', typeof localStorage !== 'undefined');
console.log('[DEBUG] Todas las keys en localStorage:', Object.keys(localStorage));

let usuarioActual = null;
let idiomaSeleccionado = null;

// ==================== CONFIGURACION IA ====================
let configIA = {
    provider: 'claude',
    keys: {
        claude: '',
        openai: '',
        gemini: '',
        groq: ''
    }
};

// ==================== NAVEGACION ====================
function mostrarPantalla(id) {
    // Ocultar todas las pantallas (buscar por ID comunes)
    ['nivel', 'operacion', 'menu', 'login', 'menuCuestionarios', 'nuevoCuestionario',
     'listaCuestionarios', 'detalleTema', 'cuestionarioActivo', 'juegoActivo',
     'menuLectura', 'generadorComic', 'cargaPDF', 'generandoComic', 'vistaComic',
     'lecturaActiva', 'evaluacion', 'configuracion'].forEach(pid => {
        const el = document.getElementById(pid);
        if (el) el.classList.add('oculto');
    });
    // Mostrar la pantalla solicitada
    const pantalla = document.getElementById(id);
    if (pantalla) {
        pantalla.classList.remove('oculto');
    }
}

function volverMenu() {
    mostrarPantalla('menu');
}

// ==================== USUARIO ====================
const temasInapropiados = [
    'porn', 'sex', 'violen', 'droga', 'matar', 'muerte', 'arma', 'guerra',
    'terror', 'miedo', 'sangre', 'adult', 'xxx', 'erotic', 'desnud',
    'alcohol', 'cigarro', 'tabaco', 'suicid', 'abus', 'racis'
];

const sugerenciasPorEdad = {
    infantil: ['Animales del bosque', 'Princesas y dragones', 'El espacio', 'Dinosaurios', 'Piratas', 'Hadas magicas'],
    medio: ['Aventuras en la selva', 'Robots del futuro', 'Misterios en el castillo', 'Superheroes', 'Viajes en el tiempo', 'Deportes'],
    mayor: ['Civilizaciones antiguas', 'Inventos que cambiaron el mundo', 'Exploracion espacial', 'Naturaleza y medio ambiente', 'Historia de la musica', 'Ciencia y descubrimientos']
};

function cargarUsuario() {
    const guardado = localStorage.getItem('usuarioAprendizaje');
    if (guardado) {
        usuarioActual = JSON.parse(guardado);
        mostrarUsuarioLogueado();
        mostrarPantalla('menu');
    }
}

function iniciarSesion() {
    const nombre = document.getElementById('nombreUsuario').value.trim();
    const edad = parseInt(document.getElementById('edadUsuario').value);

    if (!nombre) {
        alert('Por favor, escribe tu nombre');
        return;
    }
    if (!edad || edad < 3 || edad > 18) {
        alert('Por favor, escribe tu edad (entre 3 y 18 anos)');
        return;
    }

    usuarioActual = { nombre, edad };
    localStorage.setItem('usuarioAprendizaje', JSON.stringify(usuarioActual));
    mostrarUsuarioLogueado();
    mostrarPantalla('menu');
}

function mostrarUsuarioLogueado() {
    const nombreEl = document.getElementById('nombreMostrar');
    const edadEl = document.getElementById('edadMostrar');
    if (nombreEl) nombreEl.textContent = usuarioActual.nombre;
    if (edadEl) edadEl.textContent = `(${usuarioActual.edad} anos)`;
}

function cerrarSesion() {
    localStorage.removeItem('usuarioAprendizaje');
    usuarioActual = null;
    const nombreInput = document.getElementById('nombreUsuario');
    const edadInput = document.getElementById('edadUsuario');
    if (nombreInput) nombreInput.value = '';
    if (edadInput) edadInput.value = '';
    mostrarPantalla('login');
}

function esTemaInapropiado(tema) {
    const temaLower = tema.toLowerCase();
    return temasInapropiados.some(t => temaLower.includes(t));
}

// ==================== CONFIGURACION IA ====================
function cargarConfiguracion() {
    const saved = localStorage.getItem('configIA');
    console.log('[DEBUG] cargarConfiguracion - localStorage configIA:', saved);
    if (saved) {
        try {
            const savedConfig = JSON.parse(saved);
            configIA.provider = savedConfig.provider || 'claude';
            configIA.keys = savedConfig.keys || { claude: '', openai: '', gemini: '', groq: '' };
            console.log('[DEBUG] configIA cargado:', configIA.provider, 'keys:', Object.keys(configIA.keys).filter(k => configIA.keys[k]).join(','));
        } catch (e) {
            console.error('[DEBUG] Error parseando configIA:', e);
        }
    } else {
        console.log('[DEBUG] No hay configIA guardado en localStorage');
    }

    // Actualizar UI si existe
    const radio = document.querySelector(`input[name="aiProvider"][value="${configIA.provider}"]`);
    if (radio) radio.checked = true;

    const claudeInput = document.getElementById('apiKeyClaude');
    const openaiInput = document.getElementById('apiKeyOpenAI');
    const geminiInput = document.getElementById('apiKeyGemini');
    const groqInput = document.getElementById('apiKeyGroq');

    if (claudeInput) claudeInput.value = configIA.keys.claude || '';
    if (openaiInput) openaiInput.value = configIA.keys.openai || '';
    if (geminiInput) geminiInput.value = configIA.keys.gemini || '';
    if (groqInput) groqInput.value = configIA.keys.groq || '';
}

function hayAPIKeyConfigurada() {
    return configIA.keys.claude || configIA.keys.gemini || configIA.keys.openai;
}

function mostrarConfiguracion() {
    mostrarPantalla('configuracion');
    cargarConfiguracion();
}

function cambiarProveedor(provider) {
    configIA.provider = provider;
    localStorage.setItem('configIA', JSON.stringify(configIA));
}

function guardarApiKey(provider) {
    const inputMap = {
        claude: 'apiKeyClaude',
        openai: 'apiKeyOpenAI',
        gemini: 'apiKeyGemini',
        groq: 'apiKeyGroq'
    };
    const input = document.getElementById(inputMap[provider]);
    if (input) {
        configIA.keys[provider] = input.value;
        localStorage.setItem('configIA', JSON.stringify(configIA));
        console.log('[DEBUG] guardarApiKey - guardado:', provider, '- localStorage ahora:', localStorage.getItem('configIA'));
    }
}

function toggleKeyVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

async function probarConexion() {
    const estado = document.getElementById('estadoConfig');
    const key = configIA.keys[configIA.provider];

    if (!key) {
        estado.textContent = '❌ No hay API key para ' + configIA.provider;
        estado.className = 'estado-config error';
        return;
    }

    estado.textContent = '⏳ Probando conexion...';
    estado.className = 'estado-config';

    try {
        const response = await testAPIConnection(configIA.provider, key);
        if (response.ok) {
            estado.textContent = '✅ Conexion exitosa con ' + configIA.provider;
            estado.className = 'estado-config success';
        } else {
            estado.textContent = '❌ Error: ' + (response.error || 'API key invalida');
            estado.className = 'estado-config error';
        }
    } catch (e) {
        estado.textContent = '❌ Error de conexion: ' + e.message;
        estado.className = 'estado-config error';
    }
}

async function testAPIConnection(provider, key) {
    switch (provider) {
        case 'claude':
            const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Di "ok"' }]
                })
            });
            return { ok: claudeResp.ok, error: claudeResp.ok ? null : await claudeResp.text() };

        case 'openai':
            const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + key
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Di "ok"' }]
                })
            });
            return { ok: openaiResp.ok, error: openaiResp.ok ? null : await openaiResp.text() };

        case 'gemini':
            const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Di "ok"' }] }]
                })
            });
            return { ok: geminiResp.ok, error: geminiResp.ok ? null : await geminiResp.text() };
    }
}

// ==================== GENERADORES IA ====================
async function generarConClaude(prompt, imagenes, key) {
    const content = [
        ...imagenes.map(img => ({
            type: 'image',
            source: {
                type: 'base64',
                media_type: img.split(';')[0].split(':')[1],
                data: img.split(',')[1]
            }
        })),
        { type: 'text', text: prompt }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 8192,
            messages: [{ role: 'user', content: content }]
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error('Claude API: ' + error);
    }

    const data = await response.json();
    const jsonText = data.content[0].text;
    return parsearJSONSeguro(jsonText);
}

async function generarConOpenAI(prompt, imagenes, key) {
    const content = [
        { type: 'text', text: prompt },
        ...imagenes.map(img => ({
            type: 'image_url',
            image_url: { url: img }
        }))
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 4096,
            messages: [{ role: 'user', content: content }]
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error('OpenAI API: ' + error);
    }

    const data = await response.json();
    const jsonText = data.choices[0].message.content;
    return parsearJSONSeguro(jsonText);
}

async function generarConGemini(prompt, imagenes, key) {
    const parts = [
        { text: prompt },
        ...imagenes.map(img => ({
            inline_data: {
                mime_type: img.split(';')[0].split(':')[1],
                data: img.split(',')[1]
            }
        }))
    ];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: parts }],
            generationConfig: { maxOutputTokens: 16384 }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error('Gemini API: ' + error);
    }

    const data = await response.json();
    const jsonText = data.candidates[0].content.parts[0].text;
    return parsearJSONSeguro(jsonText);
}

// Funcion auxiliar para parsear JSON de forma segura
function parsearJSONSeguro(texto) {
    // Limpiar markdown
    let clean = texto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Intentar parsear directamente
    try {
        return JSON.parse(clean);
    } catch (e) {
        // Si falla, intentar arreglar JSON truncado
        console.warn('JSON truncado, intentando reparar...', e.message);

        // Cerrar strings abiertos
        const lastQuote = clean.lastIndexOf('"');
        if (lastQuote > 0 && clean.slice(lastQuote + 1).indexOf('"') === -1) {
            clean = clean.slice(0, lastQuote + 1);
        }

        // Cerrar arrays y objetos
        const openBrackets = (clean.match(/\[/g) || []).length;
        const closeBrackets = (clean.match(/\]/g) || []).length;
        const openBraces = (clean.match(/\{/g) || []).length;
        const closeBraces = (clean.match(/\}/g) || []).length;

        // Quitar coma final si existe
        clean = clean.replace(/,\s*$/, '');

        // Cerrar estructuras abiertas
        for (let i = 0; i < openBrackets - closeBrackets; i++) clean += ']';
        for (let i = 0; i < openBraces - closeBraces; i++) clean += '}';

        try {
            return JSON.parse(clean);
        } catch (e2) {
            console.error('No se pudo reparar JSON:', e2.message);
            throw new Error('El contenido generado esta incompleto. Intenta de nuevo.');
        }
    }
}

// Generadores de texto (sin imagenes)
async function generarTextoClaude(prompt, key) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 8192,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) throw new Error('Error con Claude API');
    const data = await response.json();
    const texto = data.content[0].text;
    return parsearJSONSeguro(texto);
}

async function generarTextoOpenAI(prompt, key) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 8192,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) throw new Error('Error con OpenAI API');
    const data = await response.json();
    const texto = data.choices[0].message.content;
    return parsearJSONSeguro(texto);
}

async function generarTextoGemini(prompt, key) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 8192 }
        })
    });

    if (!response.ok) throw new Error('Error con Gemini API');
    const data = await response.json();
    const texto = data.candidates[0].content.parts[0].text;
    return parsearJSONSeguro(texto);
}

// ==================== INICIALIZACION ====================
document.addEventListener('DOMContentLoaded', () => {
    cargarUsuario();
    cargarConfiguracion();
});
