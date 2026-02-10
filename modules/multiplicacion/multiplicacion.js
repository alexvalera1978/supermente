// ==================== MULTIPLICACION ====================
let operacionActual = 0;
let digitosActuales = 1;
let celdasEditables = [];
let indiceActual = 0;
let num1, num2, resultado;
let nivelActual = 'normal';

function iniciarConNivel(nivel) {
    nivelActual = nivel;
    operacionActual = 0;
    digitosActuales = 1;
    mostrarPantalla('operacion');
    generarEjercicio();
}

function generarNumero(digitos) {
    if (digitos === 1) return Math.floor(Math.random() * 9) + 1;
    const min = Math.pow(10, digitos - 1);
    const max = Math.pow(10, digitos) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generarEjercicio() {
    document.getElementById('mensaje').textContent = '';
    document.getElementById('explicacion').classList.remove('visible');
    digitosActuales = Math.floor(operacionActual / 3) + 1;

    generarMultiplicacion();

    const nivelTexto = nivelActual === 'basico' ? ' (Basico)' : '';
    document.getElementById('progreso').textContent = `Ejercicio ${operacionActual + 1}${nivelTexto}`;

    if (nivelActual === 'basico') {
        setTimeout(() => aplicarAyudas(), 100);
    }
}

function siguienteEjercicio() {
    document.getElementById('explicacion').classList.remove('visible');
    document.getElementById('mensaje').textContent = '';
    operacionActual++;
    generarEjercicio();
}

function generarMultiplicacion() {
    const digMult = Math.min(digitosActuales, 3);
    num1 = generarNumero(digMult);
    const digMult2 = Math.min(Math.floor(digitosActuales / 2) + 1, 2);
    num2 = generarNumero(digMult2);
    resultado = num1 * num2;
    renderizarMultiplicacionSVG();
}

function renderizarMultiplicacionSVG() {
    const s1 = num1.toString();
    const s2 = num2.toString().split('').reverse();
    const sr = resultado.toString();
    const maxLen = sr.length;

    const parciales = s2.map((d, i) => num1 * parseInt(d));
    window.parcialesEsperados = parciales;

    const celW = 34, celH = 40;
    const padX = 20, padY = 15;
    const fontSize = 26;

    const numFilas = 2 + s2.length + (s2.length > 1 ? 1 : 0);
    const svgW = padX * 2 + (maxLen + 1) * celW;
    const svgH = padY * 2 + numFilas * celH + 20;

    const xBase = padX + celW;
    let svg = `<svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet" style="font-family: 'Indie Flower', cursive; font-size: ${fontSize}px; max-width: 100%; height: auto;">`;

    // Fila 1: Multiplicando con carries
    const y1 = padY + celH;
    const offset1 = maxLen - s1.length;
    for (let i = 0; i < s1.length; i++) {
        const x = xBase + (offset1 + i) * celW + celW / 2;
        // Carry: más a la izquierda y separado
        svg += `<text x="${x - 12}" y="${y1 - 26}" text-anchor="middle" fill="#ffdd44" font-size="14"
                font-weight="bold" class="carry-svg" id="cm${i}"></text>`;
        // Número clickable que activa el carry
        svg += `<text x="${x}" y="${y1}" text-anchor="middle" fill="#f0f0e8"
                style="cursor:pointer;" onclick="incrementarCarrySVG('cm${i}')">${s1[i]}</text>`;
    }

    // Fila 2: Multiplicador + linea
    const y2 = y1 + celH;
    svg += `<text x="${xBase - celW/2}" y="${y2}" text-anchor="middle" fill="#ff9999" font-size="20">x</text>`;
    const offset2 = maxLen - s2.length;
    for (let i = s2.length - 1; i >= 0; i--) {
        const x = xBase + (offset2 + (s2.length - 1 - i)) * celW + celW / 2;
        svg += `<text x="${x}" y="${y2}" text-anchor="middle" fill="#f0f0e8">${s2[i]}</text>`;
    }
    svg += `<line x1="${xBase - celW/2 - 10}" y1="${y2 + 8}" x2="${xBase + maxLen * celW}" y2="${y2 + 8}" stroke="#f0f0e8" stroke-width="2"/>`;

    // Productos parciales
    let yActual = y2 + celH + 5;
    for (let p = 0; p < s2.length; p++) {
        const ps = parciales[p].toString();
        const totalCols = ps.length + p;
        const offsetP = maxLen - totalCols;

        if (p === s2.length - 1 && s2.length > 1) {
            svg += `<text x="${xBase - celW/2}" y="${yActual}" text-anchor="middle" fill="#ff9999" font-size="18">+</text>`;
        }

        for (let i = 0; i < ps.length; i++) {
            const x = xBase + (offsetP + i) * celW;
            svg += `<rect x="${x}" y="${yActual - celH + 10}" width="${celW - 4}" height="${celH - 8}"
                    fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4" rx="4"
                    class="celda-svg" data-tipo="parcial" data-fila="${p}" data-col="${i}" onclick="seleccionarCeldaSVG(this)"/>`;
            svg += `<text x="${x + celW/2 - 2}" y="${yActual}" text-anchor="middle" fill="#87CEEB"
                    class="texto-celda" data-tipo="parcial" data-fila="${p}" data-col="${i}" pointer-events="none"></text>`;
        }

        for (let i = 0; i < p; i++) {
            const x = xBase + (offsetP + ps.length + i) * celW + celW / 2;
            svg += `<text x="${x}" y="${yActual}" text-anchor="middle" fill="#555">0</text>`;
        }

        yActual += celH;
    }

    if (s2.length > 1) {
        svg += `<line x1="${xBase - celW/2 - 10}" y1="${yActual - celH + 5}" x2="${xBase + maxLen * celW}" y2="${yActual - celH + 5}" stroke="#f0f0e8" stroke-width="2"/>`;

        const offsetR = maxLen - sr.length;
        for (let i = 0; i < sr.length; i++) {
            const x = xBase + (offsetR + i) * celW;
            svg += `<rect x="${x}" y="${yActual - celH + 10}" width="${celW - 4}" height="${celH - 8}"
                    fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4" rx="4"
                    class="celda-svg" data-tipo="total" data-col="${i}" onclick="seleccionarCeldaSVG(this)"/>`;
            svg += `<text x="${x + celW/2 - 2}" y="${yActual}" text-anchor="middle" fill="#90EE90"
                    class="texto-celda" data-tipo="total" data-col="${i}" pointer-events="none"></text>`;
        }
    }

    svg += '</svg>';
    document.getElementById('contenidoPizarra').innerHTML = svg;
    inicializarCeldasMultSVG(s2.length);
}

function incrementarCarrySVG(id) {
    const el = document.getElementById(id);
    if (el) {
        let v = parseInt(el.textContent) || 0;
        v = (v + 1) % 10;
        el.textContent = v > 0 ? v : '';
    }
}

function inicializarCeldasMultSVG(numParciales) {
    celdasEditables = [];
    for (let p = 0; p < numParciales; p++) {
        const c = Array.from(document.querySelectorAll(`rect[data-tipo="parcial"][data-fila="${p}"]`));
        celdasEditables.push(...c.reverse());
    }
    if (numParciales > 1) {
        const ct = Array.from(document.querySelectorAll('rect[data-tipo="total"]'));
        celdasEditables.push(...ct.reverse());
    }
    indiceActual = 0;
    if (celdasEditables.length > 0) activarCelda(0);
}

function seleccionarCeldaSVG(rect) {
    const tipo = rect.getAttribute('data-tipo');
    const paso = rect.getAttribute('data-paso');
    const fila = rect.getAttribute('data-fila');
    const col = rect.getAttribute('data-col');

    let selector = `text.texto-celda[data-tipo="${tipo}"][data-col="${col}"]`;
    if (paso !== null) selector += `[data-paso="${paso}"]`;
    if (fila !== null) selector += `[data-fila="${fila}"]`;

    const texto = document.querySelector(selector);
    if (texto) {
        let valorActual = texto.textContent;
        let nuevoValor;

        if (valorActual === '' || valorActual === null) {
            nuevoValor = '0';
        } else {
            const num = parseInt(valorActual);
            nuevoValor = num === 9 ? '' : (num + 1).toString();
        }

        texto.textContent = nuevoValor;

        const colorOriginal = tipo === 'resultado' || tipo === 'total' ? '#90EE90' :
                             tipo === 'resto' ? '#ffcc66' :
                             tipo === 'baja' ? '#87CEEB' : '#f0f0e8';
        texto.setAttribute('fill', colorOriginal);

        rect.setAttribute('fill', 'rgba(255,255,255,0.08)');
        rect.setAttribute('stroke', 'rgba(255,255,255,0.4)');
    }
}

function activarCelda(idx) {
    celdasEditables.forEach(c => {
        c.classList.remove('activa');
        if (c.tagName === 'rect') {
            c.setAttribute('fill', 'rgba(255,255,255,0.08)');
            c.setAttribute('stroke', 'rgba(255,255,255,0.4)');
            c.setAttribute('stroke-width', '1');
        }
    });
    if (idx >= 0 && idx < celdasEditables.length) {
        indiceActual = idx;
        const celda = celdasEditables[idx];
        celda.classList.add('activa');
        if (celda.tagName === 'rect') {
            celda.setAttribute('fill', 'rgba(255,255,0,0.25)');
            celda.setAttribute('stroke', 'yellow');
            celda.setAttribute('stroke-width', '2');
        }
    }
}

function aplicarAyudas() {
    const totalCeldas = celdasEditables.length;
    const numAyudas = Math.max(1, Math.floor(totalCeldas * 0.3));
    const indicesAyuda = [];

    while (indicesAyuda.length < numAyudas) {
        const idx = Math.floor(Math.random() * totalCeldas);
        if (!indicesAyuda.includes(idx)) {
            indicesAyuda.push(idx);
        }
    }

    indicesAyuda.forEach(idx => {
        const celda = celdasEditables[idx];
        const valorCorrecto = obtenerValorCorrecto(celda);
        if (valorCorrecto) {
            if (celda.tagName === 'rect') {
                const tipo = celda.getAttribute('data-tipo');
                const col = celda.getAttribute('data-col');
                const fila = celda.getAttribute('data-fila');
                rellenarCeldaSVG(tipo, col, fila, valorCorrecto);
            }
        }
    });

    for (let i = 0; i < celdasEditables.length; i++) {
        const celda = celdasEditables[i];
        let valor = '';
        if (celda.tagName === 'rect') {
            const tipo = celda.getAttribute('data-tipo');
            const col = celda.getAttribute('data-col');
            const fila = celda.getAttribute('data-fila');
            valor = getValorCelda(tipo, col, fila);
        }
        if (!valor) {
            activarCelda(i);
            break;
        }
    }
}

function obtenerValorCorrecto(celda) {
    const tipo = celda.getAttribute('data-tipo');
    const col = parseInt(celda.getAttribute('data-col'));
    const fila = celda.getAttribute('data-fila');

    if (tipo === 'parcial' && fila !== null) {
        return window.parcialesEsperados[parseInt(fila)].toString()[col];
    }
    if (tipo === 'total') {
        return resultado.toString()[col];
    }

    return null;
}

function rellenarCeldaSVG(tipo, col, fila, valor) {
    let selector = `text.texto-celda[data-tipo="${tipo}"][data-col="${col}"]`;
    if (fila !== null) selector += `[data-fila="${fila}"]`;
    const texto = document.querySelector(selector);
    if (texto) {
        texto.textContent = valor;
        texto.style.opacity = '0.6';
    }
}

function getValorCelda(tipo, col, pasoOFila = null) {
    let selector = `text.texto-celda[data-tipo="${tipo}"][data-col="${col}"]`;
    if (pasoOFila !== null) {
        const conPaso = document.querySelector(selector + `[data-paso="${pasoOFila}"]`);
        const conFila = document.querySelector(selector + `[data-fila="${pasoOFila}"]`);
        if (conPaso) return conPaso.textContent;
        if (conFila) return conFila.textContent;
    }
    const texto = document.querySelector(selector);
    if (texto) return texto.textContent;
    return '';
}

function comprobar() {
    let ok = comprobarMult();

    const msg = document.getElementById('mensaje');
    if (ok) {
        msg.textContent = '¡Muy bien! 🎉';
        msg.className = 'tiza mensaje-ok';
        document.getElementById('explicacion').classList.remove('visible');
        setTimeout(() => {
            operacionActual++;
            generarEjercicio();
        }, 1200);
    } else {
        msg.textContent = '¡Revisa los errores!';
        msg.className = 'tiza mensaje-error';
        mostrarExplicacion();
    }
}

function comprobarMult() {
    let ok = true;
    const parciales = window.parcialesEsperados;
    const s2 = num2.toString().split('').reverse();

    for (let p = 0; p < s2.length; p++) {
        const esp = parciales[p].toString();
        for (let i = 0; i < esp.length; i++) {
            const valor = getValorCelda('parcial', i, p);
            const correcto = valor === esp[i];

            const rect = document.querySelector(`rect[data-tipo="parcial"][data-fila="${p}"][data-col="${i}"]`);
            if (rect) {
                if (correcto) {
                    rect.setAttribute('fill', 'rgba(0,255,0,0.2)');
                    rect.setAttribute('stroke', 'lightgreen');
                } else {
                    rect.setAttribute('fill', 'rgba(255,0,0,0.2)');
                    rect.setAttribute('stroke', '#ff6666');
                    const txt = document.querySelector(`text.texto-celda[data-tipo="parcial"][data-fila="${p}"][data-col="${i}"]`);
                    if (txt) {
                        txt.textContent = esp[i];
                        txt.setAttribute('fill', '#ff6666');
                    }
                    ok = false;
                }
            }
        }
    }

    if (s2.length > 1) {
        const espT = resultado.toString();
        for (let i = 0; i < espT.length; i++) {
            const valor = getValorCelda('total', i);
            const correcto = valor === espT[i];

            const rect = document.querySelector(`rect[data-tipo="total"][data-col="${i}"]`);
            if (rect) {
                if (correcto) {
                    rect.setAttribute('fill', 'rgba(0,255,0,0.2)');
                    rect.setAttribute('stroke', 'lightgreen');
                } else {
                    rect.setAttribute('fill', 'rgba(255,0,0,0.2)');
                    rect.setAttribute('stroke', '#ff6666');
                    const txt = document.querySelector(`text.texto-celda[data-tipo="total"][data-col="${i}"]`);
                    if (txt) {
                        txt.textContent = espT[i];
                        txt.setAttribute('fill', '#ff6666');
                    }
                    ok = false;
                }
            }
        }
    }
    return ok;
}

function mostrarExplicacion() {
    const exp = document.getElementById('explicacion');
    const sm2 = num2.toString().split('').reverse();
    const parciales = window.parcialesEsperados;
    let html = '<strong>¡Vamos a aprenderlo juntos!</strong><br><br>';

    html += `Multiplicamos <strong>${num1}</strong> x <strong>${num2}</strong><br><br>`;

    sm2.forEach((d, i) => {
        html += `<strong>Paso ${i + 1}:</strong> ${num1} x ${d}<br>`;
        html += `Multiplicamos cada cifra de ${num1} por ${d}:<br>`;
        const n1str = num1.toString().split('').reverse();
        let c = 0;
        n1str.forEach((dig, j) => {
            const prod = parseInt(dig) * parseInt(d) + c;
            const res = prod % 10;
            c = Math.floor(prod / 10);
            html += `&nbsp;&nbsp;${dig} x ${d}${c > 0 || prod >= 10 ? ' = ' + prod : ' = ' + res}`;
            if (prod >= 10) html += ` -> escribimos ${res}, llevamos ${Math.floor(prod/10)}`;
            html += `<br>`;
        });
        html += `&nbsp;&nbsp;<strong>= ${parciales[i]}</strong>`;
        if (i > 0) html += ` (lo escribimos una posicion a la izquierda)`;
        html += `<br><br>`;
    });

    if (sm2.length > 1) {
        html += `<strong>Sumamos los resultados:</strong><br>`;
        html += parciales.map((p, i) => p + (i > 0 ? '0'.repeat(i) : '')).join(' + ') + ` = <strong>${resultado}</strong>`;
    }

    exp.innerHTML = html;
    exp.classList.add('visible');
}

// Teclado
document.addEventListener('keydown', function(e) {
    if (!document.getElementById('operacion').classList.contains('activa')) return;
    if (e.key === 'Enter') {
        comprobar();
    }
});
