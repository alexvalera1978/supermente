// Comarcas de Catalunya - Quiz
// Datos de capitales
const CAPITALS = {
    "Terra Alta": "Gandesa",
    "Ribera d'Ebre": "Móra d'Ebre",
    "Priorat": "Falset",
    "Alt Camp": "Valls",
    "Alt Penedès": "Vilafranca del Penedès",
    "Conca de Barberà": "Montblanc",
    "Anoia": "Igualada",
    "Segrià": "Lleida",
    "Noguera": "Balaguer",
    "Pla d'Urgell": "Mollerussa",
    "Urgell": "Tàrrega",
    "Garrigues": "les Borges Blanques",
    "Segarra": "Cervera",
    "Bages": "Manresa",
    "Moianès": "Moià",
    "Vallès Occidental": "Terrassa / Sabadell",
    "Vallès Oriental": "Granollers",
    "Osona": "Vic",
    "Lluçanès": "Prats de Lluçanès",
    "Gironès": "Girona",
    "Pla de l'Estany": "Banyoles",
    "Selva": "Santa Coloma de Farners"
};

const STUDY = new Set(Object.keys(CAPITALS));

// Estado del juego
let mode = 'comarca';
let qs = [];
let qi = 0;
let score = 0;
let waiting = false;
const solved = new Set();
const origFill = {};

// Colores del tema pizarra
const COLORS = {
    success: '#90EE90',
    error: '#ff6666',
    default: '#e8954a',
    outOfScope: '#c8b48a'
};

// Cargar mapa SVG externo
async function cargarMapa() {
    try {
        const response = await fetch('assets/mapa-catalunya.svg');
        const svgText = await response.text();
        document.getElementById('mapwrap').insertAdjacentHTML('afterbegin', svgText);
        inicializarMapa();
        restart();
    } catch (error) {
        console.error('Error cargando el mapa:', error);
        document.getElementById('mapwrap').innerHTML = '<p style="color:#ff6666;text-align:center;">Error carregant el mapa</p>';
    }
}

// Inicializar interacciones del mapa
function inicializarMapa() {
    document.querySelectorAll('[data-comarca]').forEach(el => {
        origFill[el.dataset.comarca] = el.style.fill;
        el.addEventListener('click', () => handleClick(el.dataset.comarca));
    });
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildQs() {
    const p = [];
    Object.entries(CAPITALS).forEach(([n, c]) => {
        if (mode === 'comarca' || mode === 'mixed') {
            p.push({ ask: n, hint: 'On és aquesta comarca?', key: n });
        }
        if (mode === 'capital' || mode === 'mixed') {
            p.push({ ask: c, hint: 'A quina comarca pertany?', key: n });
        }
    });
    return shuffle(p);
}

function setMode(m) {
    mode = m;
    ['comarca', 'capital', 'mixed'].forEach(x => {
        document.getElementById('m-' + x).classList.toggle('on', x === m);
    });
    restart();
}

function restart() {
    qs = buildQs();
    qi = 0;
    score = 0;
    waiting = false;
    solved.clear();
    document.getElementById('ov').classList.remove('show');
    document.querySelectorAll('.map-label').forEach(l => l.remove());
    resetColors();
    showQ();
}

function showQ() {
    if (qi >= qs.length) {
        endGame();
        return;
    }
    waiting = false;
    const q = qs[qi];
    document.getElementById('ql').textContent = q.hint;
    document.getElementById('qtext').textContent = q.ask;
    document.getElementById('fb').textContent = '';
    document.getElementById('fb').className = 'fb';
    document.getElementById('sc').textContent = score;
    document.getElementById('qn').textContent = qi + 1;
    document.getElementById('tot').textContent = qs.length;
    document.getElementById('pb').style.width = ((qi / qs.length) * 100) + '%';
    resetColors();
}

function resetColors() {
    document.querySelectorAll('[data-comarca]').forEach(el => {
        const n = el.dataset.comarca;
        if (solved.has(n)) {
            el.style.fill = COLORS.success;
            el.style.fillOpacity = '1';
        } else {
            el.style.fill = origFill[n] || '';
            el.style.fillOpacity = STUDY.has(n) ? '0.85' : '0.6';
        }
        el.style.filter = '';
    });
}

function getEl(k) {
    const all = document.querySelectorAll('[data-comarca]');
    for (const el of all) {
        if (el.dataset.comarca === k) return el;
    }
    return null;
}

function addLabel(comarca, isError = false) {
    const existing = [...document.querySelectorAll('.map-label')].find(l => l.dataset.for === comarca);
    if (existing) return;

    const el = getEl(comarca);
    if (!el) return;

    const svg = document.getElementById('mapsvg');
    const wrap = document.getElementById('mapwrap');
    const bbox = el.getBBox();
    const pt = svg.createSVGPoint();
    pt.x = bbox.x + bbox.width / 2;
    pt.y = bbox.y + bbox.height / 2;
    const screen = pt.matrixTransform(svg.getScreenCTM());
    const wRect = wrap.getBoundingClientRect();

    const label = document.createElement('div');
    label.className = 'map-label';
    label.dataset.for = comarca;
    const colorNom = isError ? '#ff6666' : '#fff';
    const colorCap = isError ? '#ff9999' : '#90EE90';
    label.innerHTML = `<div class="nom" style="color:${colorNom}">${comarca.toUpperCase()}</div><div class="cap" style="color:${colorCap}">${CAPITALS[comarca] || ''}</div>`;
    label.style.left = (screen.x - wRect.left) + 'px';
    label.style.top = (screen.y - wRect.top) + 'px';
    wrap.appendChild(label);
}

function handleClick(k) {
    if (waiting || !qs.length) return;

    const q = qs[qi];
    waiting = true;

    const ok = (k === q.key);
    const clickedEl = getEl(k);
    const correctEl = getEl(q.key);

    if (ok) {
        solved.add(k);
        if (clickedEl) {
            clickedEl.style.fill = COLORS.success;
            clickedEl.style.fillOpacity = '1';
        }
        addLabel(k, false);
        score++;
    } else {
        // Solo mostrar en rojo donde hizo clic, no revelar la correcta
        if (clickedEl) {
            clickedEl.style.fill = COLORS.error;
            clickedEl.style.fillOpacity = '1';
        }
        addLabel(k, true);
    }

    const fb = document.getElementById('fb');
    fb.textContent = ok ? '✅ Correcte!' : '❌ Incorrecte!';
    fb.className = 'fb ' + (ok ? 'fc' : 'fk');
    document.getElementById('sc').textContent = score;

    // Avanzar automáticamente después de 2 segundos
    setTimeout(() => {
        next();
    }, 2000);
}

function next() {
    qi++;
    if (qi >= qs.length) {
        endGame();
    } else {
        showQ();
    }
}

function endGame() {
    const t = qs.length;
    const p = Math.round(score / t * 100);
    document.getElementById('rs').textContent = score + ' / ' + t;
    document.getElementById('rm').textContent = p >= 90 ? '🌟 Excel·lent!' : p >= 70 ? '👍 Molt bé!' : p >= 50 ? '📚 Continua!' : '💪 Segueix estudiant!';
    document.getElementById('ov').classList.add('show');
}

function volverMenu() {
    window.location.href = 'geografia.html';
}

// Inicializar cuando carga la página
document.addEventListener('DOMContentLoaded', cargarMapa);
