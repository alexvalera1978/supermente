let operacionActual = 0;
let digitosActuales = 1;
let celdasEditables = [];
let indiceActual = 0;
let num1, num2, cociente, resto;
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

    generarDivision();

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

function generarDivision() {
    const digDiv = Math.min(digitosActuales, 3);
    num2 = generarNumero(Math.max(1, Math.min(digDiv, 2)));
    cociente = generarNumero(Math.max(1, digitosActuales));
    resto = Math.floor(Math.random() * num2);
    num1 = num2 * cociente + resto;

    calcularPasosDivision();
    renderizarDivision();
}

function calcularPasosDivision() {
    window.pasosDivision = [];
    const sDividendo = num1.toString();
    const divisor = num2;
    let parcial = 0;
    let posicion = 0;

    while (posicion < sDividendo.length) {
        parcial = parcial * 10 + parseInt(sDividendo[posicion]);
        posicion++;

        if (parcial >= divisor || window.pasosDivision.length > 0) {
            const digitoCociente = Math.floor(parcial / divisor);
            const producto = digitoCociente * divisor;
            const residuo = parcial - producto;

            window.pasosDivision.push({
                parcial: parcial,
                digitoCociente: digitoCociente,
                producto: producto,
                residuo: residuo,
                posicionFinal: posicion - 1,
                bajaSiguiente: posicion < sDividendo.length ? sDividendo[posicion] : null
            });

            parcial = residuo;
        }
    }
}

function renderizarDivision() {
    const sDividendo = num1.toString();
    const sDivisor = num2.toString();
    const sCociente = cociente.toString();
    const pasos = window.pasosDivision;

    const celW = 32, celH = 36;
    const padX = 20, padY = 15;
    const fontSize = 26;

    const anchoDiv = sDividendo.length * celW;
    const anchoCaja = Math.max(sDivisor.length, sCociente.length) * celW + 10;
    const svgW = padX + anchoDiv + anchoCaja + 20;
    const altoPasos = pasos.length * celH * 2;
    const svgH = padY + celH + altoPasos + 30;

    const xBase = padX;
    const yDividendo = padY + celH;

    let svg = `<svg width="${svgW}" height="${svgH}" style="font-family: 'Indie Flower', cursive; font-size: ${fontSize}px;">`;

    for (let i = 0; i < sDividendo.length; i++) {
        const x = xBase + i * celW + celW / 2;
        svg += `<text x="${x}" y="${yDividendo}" text-anchor="middle" fill="#f0f0e8">${sDividendo[i]}</text>`;
    }

    const xCaja = xBase + anchoDiv + 5;
    svg += `<line x1="${xCaja}" y1="${yDividendo - celH + 10}" x2="${xCaja}" y2="${yDividendo + 8}" stroke="#ff6666" stroke-width="3"/>`;
    svg += `<line x1="${xCaja}" y1="${yDividendo + 8}" x2="${xCaja + anchoCaja}" y2="${yDividendo + 8}" stroke="#ff6666" stroke-width="3"/>`;

    for (let i = 0; i < sDivisor.length; i++) {
        const x = xCaja + 10 + i * celW + celW / 2;
        svg += `<text x="${x}" y="${yDividendo}" text-anchor="middle" fill="#f0f0e8">${sDivisor[i]}</text>`;
    }

    for (let i = 0; i < sCociente.length; i++) {
        const x = xCaja + 10 + i * celW;
        const y = yDividendo + 12;
        svg += `<rect x="${x}" y="${y}" width="${celW - 4}" height="${celH - 6}"
                fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4" rx="4"
                class="celda-svg" data-tipo="cociente" data-col="${i}" onclick="seleccionarCeldaSVG(this)"/>`;
        svg += `<text x="${x + celW/2 - 2}" y="${y + celH - 12}" text-anchor="middle" fill="#90EE90"
                class="texto-celda" data-tipo="cociente" data-col="${i}" pointer-events="none"></text>`;
    }

    let yActual = yDividendo + celH;

    for (let p = 0; p < pasos.length; p++) {
        const paso = pasos[p];
        const sProducto = paso.producto.toString();
        const sResiduo = paso.residuo.toString();

        const xFinParcial = xBase + (paso.posicionFinal + 1) * celW;
        const xProducto = xFinParcial - sProducto.length * celW;

        svg += `<text x="${xProducto - 12}" y="${yActual}" text-anchor="middle" fill="#ff9999" font-size="18">-</text>`;

        for (let i = 0; i < sProducto.length; i++) {
            const x = xProducto + i * celW;
            svg += `<rect x="${x}" y="${yActual - celH + 6}" width="${celW - 4}" height="${celH - 6}"
                    fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4" rx="4"
                    class="celda-svg" data-tipo="producto" data-paso="${p}" data-col="${i}" onclick="seleccionarCeldaSVG(this)"/>`;
            svg += `<text x="${x + celW/2 - 2}" y="${yActual}" text-anchor="middle" fill="#f0f0e8"
                    class="texto-celda" data-tipo="producto" data-paso="${p}" data-col="${i}" pointer-events="none"></text>`;
        }

        svg += `<line x1="${xProducto}" y1="${yActual + 4}" x2="${xFinParcial}" y2="${yActual + 4}" stroke="#f0f0e8" stroke-width="2"/>`;

        yActual += celH;

        const esUltimo = p === pasos.length - 1;
        const xResiduo = xFinParcial - sResiduo.length * celW;

        if (esUltimo) {
            for (let i = 0; i < sResiduo.length; i++) {
                const x = xResiduo + i * celW;
                svg += `<rect x="${x}" y="${yActual - celH + 6}" width="${celW - 4}" height="${celH - 6}"
                        fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4" rx="4"
                        class="celda-svg" data-tipo="resto" data-col="${i}" onclick="seleccionarCeldaSVG(this)"/>`;
                svg += `<text x="${x + celW/2 - 2}" y="${yActual}" text-anchor="middle" fill="#ffcc66"
                        class="texto-celda" data-tipo="resto" data-col="${i}" pointer-events="none"></text>`;
            }
        } else {
            for (let i = 0; i < sResiduo.length; i++) {
                const x = xResiduo + i * celW;
                svg += `<rect x="${x}" y="${yActual - celH + 6}" width="${celW - 4}" height="${celH - 6}"
                        fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4" rx="4"
                        class="celda-svg" data-tipo="residuo" data-paso="${p}" data-col="${i}" onclick="seleccionarCeldaSVG(this)"/>`;
                svg += `<text x="${x + celW/2 - 2}" y="${yActual}" text-anchor="middle" fill="#f0f0e8"
                        class="texto-celda" data-tipo="residuo" data-paso="${p}" data-col="${i}" pointer-events="none"></text>`;
            }

            if (paso.bajaSiguiente !== null) {
                const xBaja = xFinParcial;
                svg += `<rect x="${xBaja}" y="${yActual - celH + 6}" width="${celW - 4}" height="${celH - 6}"
                        fill="rgba(255,255,255,0.08)" stroke="rgba(135,206,235,0.6)" stroke-dasharray="4" rx="4"
                        class="celda-svg" data-tipo="baja" data-paso="${p}" data-col="0" onclick="seleccionarCeldaSVG(this)"/>`;
                svg += `<text x="${xBaja + celW/2 - 2}" y="${yActual}" text-anchor="middle" fill="#87CEEB"
                        class="texto-celda" data-tipo="baja" data-paso="${p}" data-col="0" pointer-events="none"></text>`;
            }
        }

        yActual += celH;
    }

    svg += '</svg>';
    document.getElementById('contenidoPizarra').innerHTML = svg;
    inicializarCeldasDiv();
}

function seleccionarCeldaSVG(rect) {
    const tipo = rect.getAttribute('data-tipo');
    const paso = rect.getAttribute('data-paso');
    const col = rect.getAttribute('data-col');

    let selector = `text.texto-celda[data-tipo="${tipo}"][data-col="${col}"]`;
    if (paso !== null) selector += `[data-paso="${paso}"]`;

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

        const colorOriginal = tipo === 'cociente' || tipo === 'total' ? '#90EE90' :
                             tipo === 'resto' ? '#ffcc66' :
                             tipo === 'baja' ? '#87CEEB' : '#f0f0e8';
        texto.setAttribute('fill', colorOriginal);

        rect.setAttribute('fill', 'rgba(255,255,255,0.08)');
        rect.setAttribute('stroke', 'rgba(255,255,255,0.4)');
    }
}

function inicializarCeldasDiv() {
    celdasEditables = [];
    const pasos = window.pasosDivision;

    celdasEditables.push(...Array.from(document.querySelectorAll('rect[data-tipo="cociente"]')));

    for (let p = 0; p < pasos.length; p++) {
        const prods = Array.from(document.querySelectorAll(`rect[data-tipo="producto"][data-paso="${p}"]`));
        celdasEditables.push(...prods);

        if (p < pasos.length - 1) {
            const resids = Array.from(document.querySelectorAll(`rect[data-tipo="residuo"][data-paso="${p}"]`));
            celdasEditables.push(...resids);

            const baja = document.querySelector(`rect[data-tipo="baja"][data-paso="${p}"]`);
            if (baja) celdasEditables.push(baja);
        }
    }

    celdasEditables.push(...Array.from(document.querySelectorAll('rect[data-tipo="resto"]')));

    indiceActual = 0;
    if (celdasEditables.length > 0) activarCelda(0);
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
                const paso = celda.getAttribute('data-paso');
                rellenarCeldaSVG(tipo, col, paso, valorCorrecto);
            }
        }
    });

    for (let i = 0; i < celdasEditables.length; i++) {
        const celda = celdasEditables[i];
        const tipo = celda.getAttribute('data-tipo');
        const col = celda.getAttribute('data-col');
        const paso = celda.getAttribute('data-paso');
        const valor = getValorCelda(tipo, col, paso);
        if (!valor) {
            activarCelda(i);
            break;
        }
    }
}

function obtenerValorCorrecto(celda) {
    const tipo = celda.getAttribute('data-tipo');
    const col = parseInt(celda.getAttribute('data-col'));
    const paso = celda.getAttribute('data-paso');

    if (tipo === 'cociente') return cociente.toString()[col];
    if (tipo === 'resto') return resto.toString()[col];
    if (tipo === 'producto' && paso !== null) {
        return window.pasosDivision[parseInt(paso)].producto.toString()[col];
    }
    if (tipo === 'residuo' && paso !== null) {
        return window.pasosDivision[parseInt(paso)].residuo.toString()[col];
    }
    if (tipo === 'baja' && paso !== null) {
        return window.pasosDivision[parseInt(paso)].bajaSiguiente;
    }

    return null;
}

function rellenarCeldaSVG(tipo, col, paso, valor) {
    let selector = `text.texto-celda[data-tipo="${tipo}"][data-col="${col}"]`;
    if (paso !== null) selector += `[data-paso="${paso}"]`;
    const texto = document.querySelector(selector);
    if (texto) {
        texto.textContent = valor;
        texto.style.opacity = '0.6';
    }
}

function getValorCelda(tipo, col, paso = null) {
    let selector = `text.texto-celda[data-tipo="${tipo}"][data-col="${col}"]`;
    if (paso !== null) {
        selector += `[data-paso="${paso}"]`;
    }
    const texto = document.querySelector(selector);
    if (texto) return texto.textContent;
    return '';
}

function marcarCelda(tipo, col, correcta, paso = null, valorCorrecto = null) {
    let selector = `rect[data-tipo="${tipo}"][data-col="${col}"]`;
    if (paso !== null) selector += `[data-paso="${paso}"]`;
    const rect = document.querySelector(selector);

    if (rect) {
        if (correcta) {
            rect.setAttribute('fill', 'rgba(0,255,0,0.2)');
            rect.setAttribute('stroke', 'lightgreen');
        } else {
            rect.setAttribute('fill', 'rgba(255,0,0,0.2)');
            rect.setAttribute('stroke', '#ff6666');
            if (valorCorrecto !== null) {
                let txtSelector = `text.texto-celda[data-tipo="${tipo}"][data-col="${col}"]`;
                if (paso !== null) txtSelector += `[data-paso="${paso}"]`;
                const txt = document.querySelector(txtSelector);
                if (txt) {
                    txt.textContent = valorCorrecto;
                    txt.setAttribute('fill', '#ff6666');
                }
            }
        }
    }
}

function comprobar() {
    let ok = comprobarDiv();

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

function comprobarDiv() {
    let ok = true;
    const pasos = window.pasosDivision;

    const espCoc = cociente.toString();
    for (let i = 0; i < espCoc.length; i++) {
        const valor = getValorCelda('cociente', i);
        const correcto = valor === espCoc[i];
        marcarCelda('cociente', i, correcto, null, espCoc[i]);
        if (!correcto) ok = false;
    }

    for (let p = 0; p < pasos.length; p++) {
        const paso = pasos[p];

        const espProd = paso.producto.toString();
        for (let i = 0; i < espProd.length; i++) {
            const valor = getValorCelda('producto', i, p);
            const correcto = valor === espProd[i];
            marcarCelda('producto', i, correcto, p, espProd[i]);
            if (!correcto) ok = false;
        }

        if (p < pasos.length - 1) {
            const espRes = paso.residuo.toString();
            for (let i = 0; i < espRes.length; i++) {
                const valor = getValorCelda('residuo', i, p);
                const correcto = valor === espRes[i];
                marcarCelda('residuo', i, correcto, p, espRes[i]);
                if (!correcto) ok = false;
            }

            if (paso.bajaSiguiente !== null) {
                const valorBaja = getValorCelda('baja', 0, p);
                const correctoBaja = valorBaja === paso.bajaSiguiente;
                marcarCelda('baja', 0, correctoBaja, p, paso.bajaSiguiente);
                if (!correctoBaja) ok = false;
            }
        }
    }

    const espResto = resto.toString();
    for (let i = 0; i < espResto.length; i++) {
        const valor = getValorCelda('resto', i);
        const correcto = valor === espResto[i];
        marcarCelda('resto', i, correcto, null, espResto[i]);
        if (!correcto) ok = false;
    }

    return ok;
}

function mostrarExplicacion() {
    const exp = document.getElementById('explicacion');
    let html = '<strong>¡Vamos a aprenderlo juntos!</strong><br><br>';

    html += `Dividimos <strong>${num1}</strong> / <strong>${num2}</strong><br><br>`;
    const pasosDiv = window.pasosDivision;
    const sDividendo = num1.toString();

    pasosDiv.forEach((paso, i) => {
        html += `<strong>Paso ${i + 1}:</strong><br>`;

        if (i === 0) {
            html += `- Empezamos por la izquierda del dividendo (${sDividendo})<br>`;
            html += `- Tomamos cifras hasta tener un numero >= ${num2}<br>`;

            let parcialTemp = 0;
            for (let j = 0; j <= paso.posicionFinal; j++) {
                parcialTemp = parcialTemp * 10 + parseInt(sDividendo[j]);
                if (j < paso.posicionFinal) {
                    html += `&nbsp;&nbsp;-> ${parcialTemp} es menor que ${num2}, seguimos tomando cifras<br>`;
                } else {
                    html += `&nbsp;&nbsp;-> <strong>${parcialTemp}</strong> es >= ${num2}, ¡ya podemos dividir!<br>`;
                }
            }
            html += `<br>`;
        } else {
            html += `- Teniamos ${pasosDiv[i-1].residuo} y bajamos el ${pasosDiv[i-1].bajaSiguiente} -> <strong>${paso.parcial}</strong><br>`;
        }

        html += `- Buscamos cuantas veces cabe <strong>${num2}</strong> en ${paso.parcial}<br>`;

        const digitoCorrecto = paso.digitoCociente;
        html += `&nbsp;&nbsp;-> ${digitoCorrecto} x ${num2} = ${paso.producto}<br>`;

        html += `- Escribimos <strong>${digitoCorrecto}</strong> en el cociente<br>`;
        html += `- Restamos: ${paso.parcial} - ${paso.producto} = <strong>${paso.residuo}</strong><br>`;
        if (paso.bajaSiguiente !== null) {
            html += `- Bajamos el <strong>${paso.bajaSiguiente}</strong> del dividendo<br>`;
        }
        html += `<br>`;
    });

    html += `<strong>Cociente: ${cociente}</strong><br>`;
    html += `<strong>Resto: ${resto}</strong><br><br>`;
    html += `<em>Comprobacion: ${num2} x ${cociente} + ${resto} = ${num2 * cociente + resto}</em>`;

    exp.innerHTML = html;
    exp.classList.add('visible');
}

document.addEventListener('keydown', function(e) {
    if (!document.getElementById('operacion').classList.contains('activa')) return;
    if (e.key === 'Enter') comprobar();
});
