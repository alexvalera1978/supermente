let tablaActual = 1;

document.addEventListener('DOMContentLoaded', () => {
    generarTablaCompleta();
});

function generarTablaCompleta() {
    document.getElementById('progreso').textContent = `Tabla del ${tablaActual}`;

    const celW = 30, celH = 32;
    const fontSize = 22;
    const filaH = 38;
    const svgW = 280;
    const svgH = 10 * filaH + 60;

    let svg = `<svg width="${svgW}" height="${svgH}" style="font-family: 'Indie Flower', cursive; font-size: ${fontSize}px;">`;

    svg += `<text x="${svgW/2}" y="30" text-anchor="middle" fill="#90EE90" font-size="24">Tabla del ${tablaActual}</text>`;

    for (let i = 1; i <= 10; i++) {
        const y = 50 + (i - 1) * filaH;
        const resultado = tablaActual * i;
        const numDigitos = resultado.toString().length;

        svg += `<text x="20" y="${y + 24}" fill="#f0f0e8">${tablaActual} x ${i} = </text>`;

        const xBase = 140;
        for (let d = 0; d < numDigitos; d++) {
            const x = xBase + d * (celW + 2);
            svg += `<rect x="${x}" y="${y + 2}" width="${celW}" height="${celH}"
                    fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4" rx="4"
                    class="celda-svg" data-tipo="tabla" data-fila="${i}" data-col="${d}" onclick="incrementarCeldaTabla(this)"/>`;
            svg += `<text x="${x + celW/2}" y="${y + 26}" text-anchor="middle" fill="#87CEEB"
                    class="texto-celda" data-tipo="tabla" data-fila="${i}" data-col="${d}" pointer-events="none"></text>`;
        }
    }

    svg += '</svg>';
    document.getElementById('contenidoPizarra').innerHTML = svg;
}

function incrementarCeldaTabla(rect) {
    const fila = rect.getAttribute('data-fila');
    const col = rect.getAttribute('data-col');

    const texto = document.querySelector(`text.texto-celda[data-tipo="tabla"][data-fila="${fila}"][data-col="${col}"]`);
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
        texto.setAttribute('fill', '#87CEEB');

        rect.setAttribute('fill', 'rgba(255,255,255,0.08)');
        rect.setAttribute('stroke', 'rgba(255,255,255,0.4)');
    }
}

function siguienteTabla() {
    document.getElementById('mensaje').textContent = '';
    tablaActual++;
    if (tablaActual > 10) {
        tablaActual = 1;
    }
    generarTablaCompleta();
}

function comprobar() {
    let ok = true;

    for (let i = 1; i <= 10; i++) {
        const esperado = (tablaActual * i).toString();

        let valorIngresado = '';
        for (let d = 0; d < esperado.length; d++) {
            const texto = document.querySelector(`text.texto-celda[data-tipo="tabla"][data-fila="${i}"][data-col="${d}"]`);
            if (texto) valorIngresado += texto.textContent || '';
        }

        for (let d = 0; d < esperado.length; d++) {
            const rect = document.querySelector(`rect[data-tipo="tabla"][data-fila="${i}"][data-col="${d}"]`);
            const texto = document.querySelector(`text.texto-celda[data-tipo="tabla"][data-fila="${i}"][data-col="${d}"]`);

            if (rect && texto) {
                if (valorIngresado === esperado) {
                    rect.setAttribute('fill', 'rgba(0,255,0,0.2)');
                    rect.setAttribute('stroke', 'lightgreen');
                } else {
                    rect.setAttribute('fill', 'rgba(255,0,0,0.2)');
                    rect.setAttribute('stroke', '#ff6666');
                    texto.textContent = esperado[d];
                    texto.setAttribute('fill', '#ff6666');
                    ok = false;
                }
            }
        }
    }

    const msg = document.getElementById('mensaje');
    if (ok) {
        msg.textContent = '¡Muy bien! 🎉';
        msg.className = 'tiza mensaje-ok';
        setTimeout(() => {
            tablaActual++;
            if (tablaActual > 10) {
                msg.textContent = '¡Has completado todas las tablas! 🏆';
            } else {
                generarTablaCompleta();
                msg.textContent = '';
            }
        }, 1500);
    } else {
        msg.textContent = '¡Revisa los errores!';
        msg.className = 'tiza mensaje-error';
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') comprobar();
});
