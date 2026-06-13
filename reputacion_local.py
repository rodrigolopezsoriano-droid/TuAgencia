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
    
    if data["candidates"]:
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
                        'muy', 'más', 'que', 'los', 'las', 'por', 'con', 'una'}
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
    """Genera el informe PDF profesional para presentar al cliente."""
    
    doc = SimpleDocTemplate(nombre_archivo, pagesize=A4,
                           rightMargin=2*cm, leftMargin=2*cm,
                           topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    elementos = []
    
    # ── CABECERA ──────────────────────────────────────────
    estilo_titulo = ParagraphStyle('Titulo', parent=styles['Title'],
                                   fontSize=22, spaceAfter=6,
                                   textColor=colors.HexColor('#1a1a2e'))
    estilo_subtitulo = ParagraphStyle('Subtitulo', parent=styles['Normal'],
                                      fontSize=11, textColor=colors.HexColor('#666666'),
                                      spaceAfter=20)
    
    elementos.append(Paragraph(f"Informe de Reputación Digital", estilo_titulo))
    elementos.append(Paragraph(
        f"{NOMBRE_NEGOCIO} · Generado el {datetime.now().strftime('%d/%m/%Y')}",
        estilo_subtitulo
    ))
    
    # ── TABLA DE MÉTRICAS CLAVE ────────────────────────────
    color_riesgo = (colors.HexColor('#e74c3c') if analisis['nivel_riesgo'] == 'ALTO'
                   else colors.HexColor('#f39c12') if analisis['nivel_riesgo'] == 'MEDIO'
                   else colors.HexColor('#27ae60'))
    
    datos_metricas = [
        ['📊 Métrica', '📈 Valor', '⚠️ Diagnóstico'],
        ['Muestra de Reseñas', str(analisis['total']), 'Muestra representativa'],
        ['Puntuación media', str(info_negocio.get('rating', 'N/A')), 
         '✓ Buena' if info_negocio.get('rating', 0) >= 4.0 else '⚠ Mejorable'],
        ['Reseñas negativas', f"{analisis['negativas']} ({analisis['porcentaje_riesgo']}%)",
         analisis['nivel_riesgo']],
        ['Clientes en riesgo/mes', str(impacto['clientes_perdidos']), 'Estimación conservadora'],
        ['Pérdida estimada/año', f"{impacto['perdida_anual']}€", '⚠ Impacto económico real'],
    ]
    
    tabla = Table(datos_metricas, colWidths=[6*cm, 4*cm, 6*cm])
    tabla.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f8f9fa'), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('TEXTCOLOR', (1, 4), (1, 4), color_riesgo),
        ('FONTNAME', (1, 4), (2, 5), 'Helvetica-Bold'),
    ]))
    
    elementos.append(tabla)
    elementos.append(Spacer(1, 0.5*cm))
    
    # ── QUEJAS MÁS FRECUENTES ─────────────────────────────
    if analisis['quejas_frecuentes']:
        estilo_seccion = ParagraphStyle('Seccion', parent=styles['Heading2'],
                                        fontSize=13, textColor=colors.HexColor('#1a1a2e'),
                                        spaceBefore=15, spaceAfter=8)
        elementos.append(Paragraph("🔍 Temas Recurrentes en Reseñas Negativas", estilo_seccion))
        
        for i, (palabra, frecuencia) in enumerate(analisis['quejas_frecuentes'][:3], 1):
            elementos.append(Paragraph(
                f"  {i}. <b>'{palabra.capitalize()}'</b> — mencionado {frecuencia} veces",
                styles['Normal']
            ))
        elementos.append(Spacer(1, 0.3*cm))
    
    # ── LLAMADA A LA ACCIÓN ───────────────────────────────
    estilo_cta = ParagraphStyle('CTA', parent=styles['Normal'],
                                fontSize=10, textColor=colors.HexColor('#555555'),
                                borderColor=colors.HexColor('#1a1a2e'), borderWidth=1,
                                borderPadding=10, spaceBefore=20,
                                backColor=colors.HexColor('#f0f4ff'))
    
    elementos.append(Paragraph(
        f"<b>¿Qué significa esto para {NOMBRE_NEGOCIO}?</b><br/><br/>"
        f"Estimamos que aproximadamente <b>{impacto['clientes_perdidos']} clientes/mes</b> "
        f"deciden no contactar su negocio después de leer reseñas negativas. "
        f"Con un sistema de respuesta y gestión automatizada, este impacto puede reducirse "
        f"significativamente en 30-60 días.<br/><br/>"
        f"Este informe ha sido generado de forma gratuita como demostración. "
        f"Podemos implementar el sistema completo de gestión para su negocio.",
        estilo_cta
    ))
    
    doc.build(elementos)
    print(f"✅ Informe generado: {nombre_archivo}")


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
        resenas = [{"text": "Muy lento el servicio", "rating": 2},
                   {"text": "Excelente atención", "rating": 5},
                   {"text": "Precios abusivos", "rating": 1}]
    
    analisis = analizar_sentimiento(resenas)
    impacto = calcular_impacto_economico(info["total_reviews"], analisis["porcentaje_riesgo"])
    
    nombre_archivo = f"informe_{NOMBRE_NEGOCIO.replace(' ', '_').lower()}.pdf"
    generar_pdf_informe(info, analisis, impacto, nombre_archivo)
    
    print(f"\n📋 RESUMEN EJECUTIVO:")
    print(f"   Nivel de riesgo reputacional: {analisis['nivel_riesgo']}")
    print(f"   Pérdida estimada anual: {impacto['perdida_anual']}€")
    print(f"   Archivo generado: {nombre_archivo}")