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

    generarResta();

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

function generarResta() {
    let a = generarNumero(digitosActuales);
    let b = generarNumero(digitosActuales);
    num1 = Math.max(a, b);
    num2 = Math.min(a, b);
    resultado = num1 - num2;
    renderizarSumaRestaSVG('-');
}

function renderizarSumaRestaSVG(op) {
    const s1 = num1.toString(), s2 = num2.toString(), sr = resultado.toString();
    const maxLen = Math.max(s1.length, s2.length, sr.length);

    const celW = 34, celH = 42;
    const padX = 20, padY = 15;
    const fontSize = 28;

    const svgW = padX * 2 + (maxLen + 1) * celW;
    const svgH = padY * 2 + celH * 3 + 20;

    const xBase = padX + celW;
    let svg = `<svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet" style="font-family: 'Indie Flower', cursive; font-size: ${fontSize}px; max-width: 100%; height: auto;">`;

    const y1 = padY + celH;
    const offset1 = maxLen - s1.length;
    for (let i = 0; i < s1.length; i++) {
        const x = xBase + (offset1 + i) * celW + celW / 2;
        // Carry: más a la izquierda y separado
        svg += `<text x="${x - 12}" y="${y1 - 26}" text-anchor="middle" fill="#ffdd44" font-size="14"
                font-weight="bold" class="carry-svg" id="cs${i}"></text>`;
        // Número clickable que activa el carry
        svg += `<text x="${x}" y="${y1}" text-anchor="middle" fill="#f0f0e8"
                style="cursor:pointer;" onclick="incrementarCarrySVG('cs${i}')">${s1[i]}</text>`;
    }

    const y2 = y1 + celH;
    svg += `<text x="${xBase - celW/2}" y="${y2}" text-anchor="middle" fill="#ff9999" font-size="22">${op}</text>`;
    const offset2 = maxLen - s2.length;
    for (let i = 0; i < s2.length; i++) {
        const x = xBase + (offset2 + i) * celW + celW / 2;
        svg += `<text x="${x}" y="${y2}" text-anchor="middle" fill="#f0f0e8">${s2[i]}</text>`;
    }
    svg += `<line x1="${xBase - celW/2 - 10}" y1="${y2 + 8}" x2="${xBase + maxLen * celW}" y2="${y2 + 8}" stroke="#f0f0e8" stroke-width="2"/>`;

    const y3 = y2 + celH + 5;
    const offset3 = maxLen - sr.length;
    for (let i = 0; i < sr.length; i++) {
        const x = xBase + (offset3 + i) * celW;
        svg += `<rect x="${x}" y="${y3 - celH + 10}" width="${celW - 4}" height="${celH - 8}"
                fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4" rx="4"
                class="celda-svg" data-tipo="resultado" data-col="${i}" onclick="seleccionarCeldaSVG(this)"/>`;
        svg += `<text x="${x + celW/2 - 2}" y="${y3}" text-anchor="middle" fill="#90EE90"
                class="texto-celda" data-tipo="resultado" data-col="${i}" pointer-events="none"></text>`;
    }

    svg += '</svg>';
    document.getElementById('contenidoPizarra').innerHTML = svg;
    inicializarCeldasSumaResta();
}

function incrementarCarrySVG(id) {
    const el = document.getElementById(id);
    if (el) {
        let v = parseInt(el.textContent) || 0;
        v = (v + 1) % 10;
        el.textContent = v > 0 ? v : '';
    }
}

function inicializarCeldasSumaResta() {
    celdasEditables = Array.from(document.querySelectorAll('rect[data-tipo="resultado"]'));
    celdasEditables.reverse();
    indiceActual = 0;
    if (celdasEditables.length > 0) activarCelda(0);
}

function seleccionarCeldaSVG(rect) {
    const tipo = rect.getAttribute('data-tipo');
    const col = rect.getAttribute('data-col');

    const texto = document.querySelector(`text.texto-celda[data-tipo="${tipo}"][data-col="${col}"]`);
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
        texto.setAttribute('fill', '#90EE90');
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

    const rs = resultado.toString();
    indicesAyuda.forEach(idx => {
        const celda = celdasEditables[idx];
        const valorCorrecto = rs[rs.length - 1 - idx];
        if (valorCorrecto && celda.tagName === 'rect') {
            const col = celda.getAttribute('data-col');
            const texto = document.querySelector(`text.texto-celda[data-tipo="resultado"][data-col="${col}"]`);
            if (texto) {
                texto.textContent = valorCorrecto;
                texto.style.opacity = '0.6';
            }
        }
    });

    for (let i = 0; i < celdasEditables.length; i++) {
        const celda = celdasEditables[i];
        const col = celda.getAttribute('data-col');
        const texto = document.querySelector(`text.texto-celda[data-tipo="resultado"][data-col="${col}"]`);
        if (!texto || !texto.textContent) {
            activarCelda(i);
            break;
        }
    }
}

function comprobar() {
    const esperado = resultado.toString().split('').reverse();
    let ok = true;

    celdasEditables.forEach((celda, i) => {
        const valorEsperado = esperado[i];
        const col = celda.getAttribute('data-col');
        const texto = document.querySelector(`text.texto-celda[data-tipo="resultado"][data-col="${col}"]`);
        const valor = texto ? texto.textContent : '';
        const correcto = valor === valorEsperado;

        if (correcto) {
            celda.setAttribute('fill', 'rgba(0,255,0,0.2)');
            celda.setAttribute('stroke', 'lightgreen');
        } else {
            celda.setAttribute('fill', 'rgba(255,0,0,0.2)');
            celda.setAttribute('stroke', '#ff6666');
            if (texto) {
                texto.textContent = valorEsperado;
                texto.setAttribute('fill', '#ff6666');
            }
            ok = false;
        }
    });

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

function mostrarExplicacion() {
    const exp = document.getElementById('explicacion');
    let html = '<strong>¡Vamos a aprenderlo juntos!</strong><br><br>';

    html += `Restamos <strong>${num1}</strong> - <strong>${num2}</strong><br><br>`;
    html += `Empezamos por la derecha:<br>`;
    const r1 = num1.toString().split('').reverse().map(Number);
    const r2 = num2.toString().split('').reverse().map(Number);
    let borrow = 0;
    for (let i = 0; i < r1.length; i++) {
        let d1 = r1[i] - borrow;
        const d2 = r2[i] || 0;
        if (d1 < d2) {
            html += `- ${d1} es menor que ${d2}, pedimos prestado -> ${d1 + 10} - ${d2} = ${d1 + 10 - d2}<br>`;
            borrow = 1;
        } else {
            html += `- ${d1} - ${d2} = ${d1 - d2}<br>`;
            borrow = 0;
        }
    }
    html += `<br><strong>Resultado: ${resultado}</strong>`;

    exp.innerHTML = html;
    exp.classList.add('visible');
}

document.addEventListener('keydown', function(e) {
    if (!document.getElementById('operacion').classList.contains('activa')) return;
    if (e.key === 'Enter') comprobar();
});
