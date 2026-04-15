#!/usr/bin/env python3
"""
Analizador de Pronunciación con Gemini + TTS para pronunciación correcta
Uso: python test_gemini_audio.py <api_key> <audio_file> [texto_original]
"""

import sys
import os
import base64
import json
import urllib.request
import urllib.error

def analizar_pronunciacion(api_key, audio_path, texto_original=None):
    # Leer y codificar el audio
    with open(audio_path, 'rb') as f:
        audio_data = base64.b64encode(f.read()).decode('utf-8')

    # Detectar mime type
    ext = audio_path.lower().split('.')[-1]
    mime_types = {
        'mp3': 'audio/mp3',
        'wav': 'audio/wav',
        'webm': 'audio/webm',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        'flac': 'audio/flac'
    }
    mime_type = mime_types.get(ext, 'audio/mpeg')

    if texto_original:
        prompt = f"""Eres un profesor de lengua experto en evaluar lectura en voz alta.

TEXTO ORIGINAL QUE DEBÍA LEER EL ESTUDIANTE:
"{texto_original}"

TAREA: Escucha atentamente el audio y evalúa la lectura del estudiante.

ANALIZA:
1. ¿Qué palabras ha pronunciado MAL o de forma incorrecta? Indica CÓMO las pronunció mal.
2. ¿Qué palabras ha OMITIDO (no las ha dicho)?
3. ¿Qué palabras ha AÑADIDO que no estaban en el texto?
4. ¿Cómo es la FLUIDEZ? (fluida, con pausas, entrecortada)
5. ¿Cómo es la ENTONACIÓN? (natural, monótona, exagerada)
6. ¿Cómo es la VELOCIDAD? (adecuada, muy rápida, muy lenta)

Responde ÚNICAMENTE con este JSON:
{{
  "transcripcion": "exactamente lo que ha dicho el estudiante",
  "palabras_mal_pronunciadas": [
    {{"palabra": "vegada", "como_lo_dijo": "begada", "correccion": "La 'v' en catalán se pronuncia como 'v' labiodental"}},
    {{"palabra": "botiga", "como_lo_dijo": "botija", "correccion": "La 'g' intervocálica es suave, no como 'j'"}}
  ],
  "palabras_omitidas": ["palabra3"],
  "palabras_anadidas": ["palabra4"],
  "fluidez": "fluida/con pausas/entrecortada",
  "entonacion": "natural/monótona/exagerada",
  "velocidad": "adecuada/rápida/lenta",
  "puntuacion": 85,
  "feedback": "Mensaje específico sobre qué mejorar",
  "consejos": ["Consejo específico 1", "Consejo específico 2"]
}}"""
    else:
        prompt = """Eres un profesor de lengua experto en evaluar pronunciación y dicción.

TAREA: Escucha atentamente el audio y evalúa cómo habla el estudiante.

ANALIZA:
1. ¿Qué palabras ha pronunciado MAL o de forma poco clara? Indica CÓMO las pronunció.
2. ¿Hay titubeos, muletillas o repeticiones?
3. ¿Cómo es la FLUIDEZ? (fluida, con pausas, entrecortada)
4. ¿Cómo es la ENTONACIÓN? (natural, monótona, exagerada)
5. ¿Cómo es la VELOCIDAD? (adecuada, muy rápida, muy lenta)

Responde ÚNICAMENTE con este JSON:
{
  "transcripcion": "exactamente lo que ha dicho",
  "idioma_detectado": "catalán/español/inglés/etc",
  "palabras_mal_pronunciadas": [
    {"palabra": "vegada", "como_lo_dijo": "begada", "correccion": "explicación de cómo debería pronunciarse"},
    {"palabra": "botiga", "como_lo_dijo": "botija", "correccion": "explicación"}
  ],
  "titubeos_muletillas": ["eh", "mmm"],
  "fluidez": "fluida/con pausas/entrecortada",
  "entonacion": "natural/monótona/exagerada",
  "velocidad": "adecuada/rápida/lenta",
  "claridad": "clara/regular/confusa",
  "puntuacion": 85,
  "feedback": "Mensaje específico",
  "consejos": ["Consejo 1", "Consejo 2"]
}"""

    # Construir request
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": audio_data
                    }
                }
            ]
        }],
        "generationConfig": {
            "maxOutputTokens": 4096
        }
    }

    data_json = json.dumps(payload).encode('utf-8')

    req = urllib.request.Request(url, data=data_json, headers={
        'Content-Type': 'application/json'
    })

    try:
        print(f"Audio: {audio_path}")
        print(f"Tamaño base64: {len(audio_data)} chars")
        print(f"MIME type: {mime_type}")
        if texto_original:
            print(f"Texto original: {texto_original[:50]}...")
        else:
            print("Modo: Solo análisis de pronunciación (sin texto de referencia)")
        print("-" * 50)
        print("Analizando con Gemini 2.5 Flash...")
        print("-" * 50)

        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))

            if 'candidates' in result and result['candidates']:
                text = result['candidates'][0]['content']['parts'][0]['text']

                # Intentar parsear JSON
                try:
                    clean = text.replace('```json', '').replace('```', '').strip()
                    data = json.loads(clean)

                    print("\n" + "=" * 60)
                    print("RESULTADO DEL ANÁLISIS")
                    print("=" * 60)

                    print(f"\n📝 TRANSCRIPCIÓN:\n{data.get('transcripcion', 'N/A')}")

                    if data.get('idioma_detectado'):
                        print(f"\n🌐 IDIOMA DETECTADO: {data.get('idioma_detectado')}")

                    # Palabras mal pronunciadas con detalle
                    palabras_mal = data.get('palabras_mal_pronunciadas', [])
                    if palabras_mal:
                        print(f"\n❌ PALABRAS MAL PRONUNCIADAS ({len(palabras_mal)}):")
                        print("-" * 40)
                        for p in palabras_mal:
                            if isinstance(p, dict):
                                print(f"  • {p.get('palabra', 'N/A')}")
                                print(f"    Dijiste: \"{p.get('como_lo_dijo', 'N/A')}\"")
                                print(f"    Corrección: {p.get('correccion', 'N/A')}")
                                print()
                            else:
                                print(f"  • {p}")
                    else:
                        print("\n✅ PALABRAS MAL PRONUNCIADAS: Ninguna")

                    if 'palabras_omitidas' in data and data['palabras_omitidas']:
                        print(f"\n⏭️ PALABRAS OMITIDAS: {', '.join(data['palabras_omitidas'])}")

                    if 'palabras_anadidas' in data and data['palabras_anadidas']:
                        print(f"\n➕ PALABRAS AÑADIDAS: {', '.join(data['palabras_anadidas'])}")

                    if 'titubeos_muletillas' in data and data['titubeos_muletillas']:
                        print(f"\n🔄 TITUBEOS/MULETILLAS: {', '.join(data['titubeos_muletillas'])}")

                    print(f"\n📊 EVALUACIÓN:")
                    print(f"   Fluidez: {data.get('fluidez', 'N/A')}")
                    print(f"   Entonación: {data.get('entonacion', 'N/A')}")
                    print(f"   Velocidad: {data.get('velocidad', 'N/A')}")
                    if 'claridad' in data:
                        print(f"   Claridad: {data.get('claridad', 'N/A')}")

                    print(f"\n🏆 PUNTUACIÓN: {data.get('puntuacion', 'N/A')}/100")

                    print(f"\n💬 FEEDBACK:\n{data.get('feedback', 'N/A')}")

                    consejos = data.get('consejos', [])
                    if consejos:
                        print(f"\n💡 CONSEJOS:")
                        for c in consejos:
                            print(f"   • {c}")

                    # Generar audios de pronunciación correcta
                    if palabras_mal:
                        print("\n" + "=" * 60)
                        generar_audios_correctos(api_key, palabras_mal, data.get('idioma_detectado', 'catalán'))

                    return data

                except json.JSONDecodeError:
                    print("RESPUESTA (no JSON):")
                    print(text)
                    return None

            else:
                print("Sin respuesta válida")
                print(json.dumps(result, indent=2))
                return None

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"ERROR HTTP {e.code}:")
        print(error_body)
        return None
    except Exception as e:
        print(f"ERROR: {e}")
        return None


def generar_audios_correctos(api_key, palabras_mal, idioma):
    """Genera audios de pronunciación correcta usando Gemini TTS"""

    print("GENERANDO AUDIOS DE PRONUNCIACIÓN CORRECTA")
    print("=" * 60)

    # Crear carpeta para audios
    output_dir = "audios_correccion"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Mapear idioma a código
    lang_map = {
        'catalán': 'ca-ES',
        'catalan': 'ca-ES',
        'español': 'es-ES',
        'spanish': 'es-ES',
        'inglés': 'en-US',
        'english': 'en-US'
    }
    lang_code = lang_map.get(idioma.lower(), 'ca-ES')

    palabras_para_tts = []
    for p in palabras_mal:
        if isinstance(p, dict):
            palabras_para_tts.append(p.get('palabra', ''))
        else:
            palabras_para_tts.append(p)

    palabras_para_tts = [p for p in palabras_para_tts if p]

    if not palabras_para_tts:
        print("No hay palabras para generar audio.")
        return

    # Usar Google Cloud TTS via API simple (gTTS style)
    try:
        # Intentar con gTTS si está instalado
        from gtts import gTTS

        for palabra in palabras_para_tts:
            output_file = os.path.join(output_dir, f"{palabra}.mp3")
            tts = gTTS(text=palabra, lang=lang_code[:2])
            tts.save(output_file)
            print(f"✅ Audio generado: {output_file}")

        print(f"\n📁 Audios guardados en: {os.path.abspath(output_dir)}/")

    except ImportError:
        print("\n⚠️ Para generar audios, instala gTTS:")
        print("   pip install gtts")
        print("\nPalabras a practicar:")
        for p in palabras_para_tts:
            print(f"   • {p}")

        # Alternativa: generar URL de Google Translate TTS
        print("\n🔊 Puedes escuchar la pronunciación correcta aquí:")
        for palabra in palabras_para_tts:
            url = f"https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl={lang_code[:2]}&q={urllib.parse.quote(palabra)}"
            print(f"   {palabra}: {url}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("=" * 60)
        print("ANALIZADOR DE PRONUNCIACIÓN CON GEMINI")
        print("=" * 60)
        print("")
        print("Uso:")
        print("  python test_gemini_audio.py <api_key> <audio> [texto_original]")
        print("")
        print("Ejemplos:")
        print('  # Con texto de referencia:')
        print('  python test_gemini_audio.py AIzaSy... lectura.mp3 "El gato juega"')
        print("")
        print('  # Sin texto (solo analiza pronunciación):')
        print('  python test_gemini_audio.py AIzaSy... lectura.m4a')
        print("")
        print("Formatos soportados: mp3, wav, m4a, webm, ogg, aac, flac")
        print("")
        print("El script generará audios de pronunciación correcta en ./audios_correccion/")
        sys.exit(1)

    api_key = sys.argv[1]
    audio_file = sys.argv[2]
    texto_original = sys.argv[3] if len(sys.argv) > 3 else None

    analizar_pronunciacion(api_key, audio_file, texto_original)
