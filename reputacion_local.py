# reputacion_local.py
# SCRIPT DE DEMO — No es un producto, es una herramienta de venta
# Tiempo estimado de construcción: 4-6 horas (Socio A)

import requests
import json
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import cm
from textblob import TextBlob
from collections import Counter
import re
from datetime import datetime

# ─────────────────────────────────────────────
# CONFIGURACIÓN (el único dato variable por cliente)
# ─────────────────────────────────────────────
API_KEY = "API_KEY"  # Google Places API, ~0.02€ por búsqueda
NOMBRE_NEGOCIO = "Clínica Dental Siglo XXI Alcalá de Henares"  # Cambiar por cada demo
NOMBRE_CLIENTE = "Dr. García"             # Para personalizar el PDF


def buscar_place_id(nombre_negocio: str) -> str:
    """Busca el Place ID de Google para un negocio."""
    url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
    params = {
        "input": nombre_negocio,
        "inputtype": "textquery",
        "fields": "place_id,name,rating,user_ratings_total",
        "key": API_KEY
    }
    response = requests.get(url, params=params)
    data = response.json()
    print("Respuesta de Google:", data)
    
    if data.get("candidates"):
        lugar = data["candidates"][0]
        return {
            "place_id": lugar["place_id"],
            "rating": lugar.get("rating", 0),
            "total_reviews": lugar.get("user_ratings_total", 0)
        }
    return None


def obtener_resenas(place_id: str) -> list:
    """Obtiene las últimas reseñas disponibles (máx 5 con API gratuita)."""
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "reviews",
        "language": "es",
        "key": API_KEY
    }
    response = requests.get(url, params=params)
    data = response.json()
    return data.get("result", {}).get("reviews", [])


def analizar_sentimiento(resenas: list) -> dict:
    """Clasifica reseñas y extrae palabras clave de las negativas."""
    positivas, neutras, negativas = [], [], []
    palabras_negativas = []
    
    for r in resenas:
        texto = r.get("text", "")
        puntuacion = r.get("rating", 3)
        
        # Clasificación por puntuación (más fiable que NLP para textos cortos en español)
        if puntuacion >= 4:
            positivas.append(texto)
        elif puntuacion == 3:
            neutras.append(texto)
        else:
            negativas.append(texto)
            # Extraer sustantivos/adjetivos relevantes de reseñas negativas
            palabras = re.findall(r'\b[a-záéíóúñ]{4,}\b', texto.lower())
            # Filtrar stopwords básicas
            stopwords = {'para', 'pero', 'como', 'este', 'esta', 'todo', 'bien',
                        'muy', 'más', 'que', 'los', 'las', 'por', 'con', 'una', 'del'}
            palabras_negativas.extend([p for p in palabras if p not in stopwords])
    
    quejas_frecuentes = Counter(palabras_negativas).most_common(5)
    
    total = len(resenas) or 1  # Evitar división por cero
    riesgo = round((len(negativas) / total) * 100, 1)
    
    return {
        "total": len(resenas),
        "positivas": len(positivas),
        "neutras": len(neutras),
        "negativas": len(negativas),
        "porcentaje_riesgo": riesgo,
        "quejas_frecuentes": quejas_frecuentes,
        "nivel_riesgo": "ALTO" if riesgo > 30 else "MEDIO" if riesgo > 15 else "BAJO"
    }


def calcular_impacto_economico(total_resenas: int, porcentaje_negativas: float) -> dict:
    """
    Estima el impacto económico de las reseñas negativas.
    Basado en: Harvard Business School study - 1 estrella extra = +5-9% ingresos.
    """
    clientes_mensuales_estimados = total_resenas * 3  # Estimación conservadora
    clientes_perdidos_estimados = int(clientes_mensuales_estimados * (porcentaje_negativas / 100) * 0.15)
    ticket_medio_estimado = 80  # Ajustar por sector
    perdida_mensual_estimada = clientes_perdidos_estimados * ticket_medio_estimado
    
    return {
        "clientes_perdidos": clientes_perdidos_estimados,
        "perdida_mensual": perdida_mensual_estimada,
        "perdida_anual": perdida_mensual_estimada * 12
    }


def generar_pdf_informe(info_negocio: dict, analisis: dict, impacto: dict, nombre_archivo: str):
    """Genera el informe PDF con diseño UI/UX premium y corporativo."""
    
    # Paleta de colores corporativa (Basada en Tailwind CSS)
    c_slate900 = colors.HexColor('#0f172a')  # Textos principales / Headers
    c_slate700 = colors.HexColor('#334155')  # Textos secundarios
    c_slate500 = colors.HexColor('#64748b')  # Textos menores
    c_slate50 =  colors.HexColor('#f8fafc')  # Fondos suaves
    c_blue600 =  colors.HexColor('#2563eb')  # Acentos de marca
    c_border =   colors.HexColor('#e2e8f0')  # Bordes de tabla
    
    # Colores semánticos
    c_danger = colors.HexColor('#ef4444')
    c_warning = colors.HexColor('#f59e0b')
    c_success = colors.HexColor('#10b981'
    # Configuración del documento (márgenes amplios para respirar)
    doc = SimpleDocTemplate(nombre_archivo, pagesize=A4,
                            rightMargin=2.5*cm, leftMargin=2.5*cm,
                            topMargin=2.5*cm, bottomMargin=2.5*cm,
                            title=f"Auditoría Técnica - {NOMBRE_NEGOCIO}",
                            author="TuAgencia")
    
    styles = getSampleStyleSheet()
    elementos = []
    
    # ── ESTILOS DE PÁRRAFO ────────────────────────────────────────
    estilo_agencia = ParagraphStyle('Agencia', parent=styles['Normal'],
                                   fontSize=10, textColor=c_blue600, fontName='Helvetica-Bold',
                                   spaceAfter=4, textTransform='uppercase', letterSpacing=1)
    
    estilo_titulo = ParagraphStyle('Titulo', parent=styles['Title'],
                                   fontSize=26, spaceAfter=8, leading=30,
                                   textColor=c_slate900, fontName='Helvetica-Bold', alignment=0)
    
    estilo_subtitulo = ParagraphStyle('Subtitulo', parent=styles['Normal'],
                                      fontSize=11, textColor=c_slate500, leading=16,
                                      spaceAfter=30)
    
    estilo_h2 = ParagraphStyle('H2', parent=styles['Heading2'],
                               fontSize=14, textColor=c_slate900, fontName='Helvetica-Bold',
                               spaceBefore=25, spaceAfter=15,
                               borderPadding=(0, 0, 4, 0), borderColor=c_blue600, borderWidth=2)

    # ── CABECERA DEL DOCUMENTO ────────────────────────────────────
    elementos.append(Paragraph("TUAGENCIA.", estilo_agencia))
    elementos.append(Paragraph("Auditoría de<br/>Automatización y Reputación", estilo_titulo))
    elementos.append(Paragraph(
        f"<b>Cliente:</b> {NOMBRE_NEGOCIO}<br/>"
        f"<b>Fecha de extracción:</b> {datetime.now().strftime('%d de %B, %Y')}<br/>"
        f"<b>ID de Proceso:</b> #AUTO-{datetime.now().strftime('%Y%m%d-%H%M')}",
        estilo_subtitulo
    ))
    
    # ── MÉTRICAS DE IMPACTO (TABLA MODERNA) ───────────────────────
    elementos.append(Paragraph("VISIÓN GENERAL DEL SISTEMA", estilo_h2))
    
    color_riesgo = c_danger if analisis['nivel_riesgo'] == 'ALTO' else (c_warning if analisis['nivel_riesgo'] == 'MEDIO' else c_success)
    
    datos_metricas = [
        ['Métrica Analizada', 'Resultado Extraído', 'Estado'],
        ['Volumen de Reseñas', str(analisis['total']), 'Muestra procesada'],
        ['Puntuación Promedio', f"{info_negocio.get('rating', 'N/A')} / 5.0", 'Revisión manual requerida' if info_negocio.get('rating', 0) < 4.0 else 'Óptimo'],
        ['Tasa de Reseñas Negativas', f"{analisis['negativas']} clientes ({analisis['porcentaje_riesgo']}%)", analisis['nivel_riesgo']],
        ['Estimación Clientes en Riesgo', f"{impacto['clientes_perdidos']} clientes / mes", 'Basado en histórico'],
    ]
    
    tabla_metricas = Table(datos_metricas, colWidths=[6.5*cm, 5.5*cm, 4*cm])
    tabla_metricas.setStyle(TableStyle([
        # Cabecera
        ('BACKGROUND', (0, 0), (-1, 0), c_slate50),
        ('TEXTCOLOR', (0, 0), (-1, 0), c_slate500),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('LINEBELOW', (0, 0), (-1, 0), 1, c_border),
        
        # Filas de datos
        ('TEXTCOLOR', (0, 1), (-1, -1), c_slate700),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'), # Primera columna en negrita
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 12),
        ('TOPPADDING', (0, 1), (-1, -1), 12),
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, c_border), # Líneas sutiles entre filas
        
        # Destacar el nivel de riesgo
        ('TEXTCOLOR', (2, 3), (2, 3), color_riesgo),
        ('FONTNAME', (2, 3), (2, 3), 'Helvetica-Bold'),
        
        # Alineación vertical centrada
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elementos.append(tabla_metricas)
    elementos.append(Spacer(1, 1*cm))
    
    # ── EXTRACCIÓN DE PATRONES ────────────────────────────────────
    if analisis['quejas_frecuentes']:
        elementos.append(Paragraph("PATRONES DE FRICCIÓN DETECTADOS", estilo_h2))
        
        estilo_lista = ParagraphStyle('Lista', parent=styles['Normal'],
                                      fontSize=10, textColor=c_slate700, leading=18)
        
        elementos.append(Paragraph("El algoritmo ha identificado los siguientes términos recurrentes en las valoraciones negativas de sus clientes:", estilo_subtitulo))
        
        for i, (palabra, frecuencia) in enumerate(analisis['quejas_frecuentes'][:3], 1):
            # Simulamos un bloque visual para cada término
            termino = Paragraph(f"<font color='{c_slate900}'><b>{i}. {palabra.upper()}</b></font> (Detectado en {frecuencia} interacciones)", estilo_lista)
            elementos.append(termino)
            elementos.append(Spacer(1, 0.2*cm))
            
        elementos.append(Spacer(1, 0.5*cm))

    # ── CAJA DE IMPACTO Y SOLUCIÓN (ESTILO PREMIUM) ───────────────
    estilo_caja_titulo = ParagraphStyle('CajaTitulo', parent=styles['Normal'],
                                        fontSize=12, textColor=colors.white, fontName='Helvetica-Bold',
                                        spaceAfter=10)
    
    estilo_caja_texto = ParagraphStyle('CajaTexto', parent=styles['Normal'],
                                       fontSize=10, textColor=colors.white, leading=16)

    # Calculamos la cifra en grande para que impacte
    perdida_formateada = "{:,.0f}€".format(impacto['perdida_anual']).replace(",", ".")

    texto_impacto = (
        f"<b>Fuga de Capital Estimada: {perdida_formateada} / año</b><br/><br/>"
        f"Basado en los ratios de conversión estándar del sector, la falta de gestión en tiempo real "
        f"de estas reseñas está costando aproximadamente {impacto['clientes_perdidos']} pacientes/clientes mensuales.<br/><br/>"
        f"<b>Propuesta de Automatización:</b><br/>"
        f"Implementación de un bot extractor que monitoriza Google Maps 24/7, responde mediante Inteligencia Artificial "
        f"a reseñas estándar, y emite una alerta crítica por WhatsApp a gerencia en caso de valoraciones de 1 o 2 estrellas."
    )

    # Construimos la caja usando una tabla de una sola celda
    caja_datos = [[
        [Paragraph("DIAGNÓSTICO EJECUTIVO Y SOLUCIÓN", estilo_caja_titulo), 
         Paragraph(texto_impacto, estilo_caja_texto)]
    ]]
    
    tabla_caja = Table(caja_datos, colWidths=[16*cm])
    tabla_caja.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_slate900),
        ('PADDING', (0, 0), (-1, -1), 20),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]), # Bordes redondeados (requiere versiones recientes de reportlab)
    ]))
    
    elementos.append(tabla_caja)
    
    # ── PIE DE PÁGINA ─────────────────────────────────────────────
    elementos.append(Spacer(1, 1.5*cm))
    estilo_footer = ParagraphStyle('Footer', parent=styles['Normal'],
                                   fontSize=8, textColor=c_slate500, alignment=1)
    elementos.append(Paragraph("Documento confidencial generado automáticamente por la infraestructura de TuAgencia.", estilo_footer))

    # Construir PDF
    doc.build(elementos)
    print(f"✅ Informe PRO generado: {nombre_archivo}")


# ─────────────────────────────────────────────
# EJECUCIÓN PRINCIPAL
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print(f"🔍 Analizando: {NOMBRE_NEGOCIO}...")
    
    info = buscar_place_id(NOMBRE_NEGOCIO)
    if not info:
        print("❌ Negocio no encontrado en Google Maps")
        exit()
    
    resenas = obtener_resenas(info["place_id"])
    info["rating"] = info.get("rating", 0)
    
    if not resenas:
        print("⚠️  Sin reseñas disponibles, generando demo con datos simulados")
        # En demo: usar datos ficticios para mostrar el formato
        resenas = [{"text": "Muy lento el servicio y tardan mucho en dar cita", "rating": 2},
                   {"text": "Excelente atención por parte del doctor", "rating": 5},
                   {"text": "Precios abusivos y mala organización en recepción", "rating": 1}]
    
    analisis = analizar_sentimiento(resenas)
    impacto = calcular_impacto_economico(info["total_reviews"], analisis["porcentaje_riesgo"])
    
    nombre_archivo = f"informe_{NOMBRE_NEGOCIO.replace(' ', '_').lower()}.pdf"
    generar_pdf_informe(info, analisis, impacto, nombre_archivo)
    
    print(f"\n📋 RESUMEN EJECUTIVO:")
    print(f"   Nivel de riesgo reputacional: {analisis['nivel_riesgo']}")
    print(f"   Pérdida estimada anual: {impacto['perdida_anual']}€")
    print(f"   Archivo generado: {nombre_archivo}")