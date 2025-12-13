#!/usr/bin/env python3
"""
Générateur de vidéo "Mais qui est le loup ?"
Crée une vidéo avec animation de texte et audio synthétisé
"""

import os
import sys

print("🎬 Générateur de vidéo 'Mais qui est le loup ?'\n")

# Vérifier les dépendances
try:
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    print("✅ PIL/Pillow installé")
except ImportError:
    print("❌ PIL/Pillow manquant")
    print("Installation: pip install pillow")
    sys.exit(1)

try:
    import cv2
    print("✅ OpenCV installé")
except ImportError:
    print("❌ OpenCV manquant")
    print("Installation: pip install opencv-python")
    sys.exit(1)

try:
    from gtts import gTTS
    print("✅ gTTS installé")
except ImportError:
    print("❌ gTTS manquant")
    print("Installation: pip install gtts")
    sys.exit(1)

print("\n📹 Génération de la vidéo...\n")

# Configuration
WIDTH = 800
HEIGHT = 450
FPS = 30
DURATION = 3  # secondes
TOTAL_FRAMES = FPS * DURATION

# Couleurs
BG_COLOR_START = (15, 15, 26)  # Bleu foncé
BG_COLOR_END = (69, 10, 10)    # Rouge foncé
TEXT_COLOR = (255, 255, 255)
TEXT_SHADOW = (220, 38, 38)

# Créer le dossier de sortie
output_dir = "public/videos"
os.makedirs(output_dir, exist_ok=True)

# 1. Générer l'audio avec gTTS
print("🎙️  Génération de l'audio...")
text = "Mais qui est le loup ?"
audio_file = os.path.join(output_dir, "temp_audio.mp3")

try:
    tts = gTTS(text=text, lang='fr', slow=True)  # slow=True pour effet inquiétant
    tts.save(audio_file)
    print(f"✅ Audio généré: {audio_file}")
except Exception as e:
    print(f"❌ Erreur génération audio: {e}")
    sys.exit(1)

# 2. Générer les frames vidéo
print(f"🎨 Génération de {TOTAL_FRAMES} frames...")

frames = []
for frame_num in range(TOTAL_FRAMES):
    progress = frame_num / TOTAL_FRAMES
    
    # Créer l'image
    img = Image.new('RGB', (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(img)
    
    # Fond dégradé animé
    for y in range(HEIGHT):
        ratio = y / HEIGHT
        r = int(BG_COLOR_START[0] + (BG_COLOR_END[0] - BG_COLOR_START[0]) * ratio * progress)
        g = int(BG_COLOR_START[1] + (BG_COLOR_END[1] - BG_COLOR_START[1]) * ratio * progress)
        b = int(BG_COLOR_START[2] + (BG_COLOR_END[2] - BG_COLOR_START[2]) * ratio * progress)
        draw.rectangle([0, y, WIDTH, y+1], fill=(r, g, b))
    
    # Effet de particules (étoiles)
    for i in range(50):
        x = (i * 137.5 + frame_num * 2) % WIDTH
        y = (i * 97 + frame_num) % HEIGHT
        size = int((np.sin(frame_num * 0.1 + i) + 1) * 2)
        alpha = int(128 * (np.sin(frame_num * 0.1 + i) + 1) / 2)
        color = (220, 38, 38, alpha)
        draw.ellipse([x-size, y-size, x+size, y+size], fill=color[:3])
    
    # Animation du texte
    scale = 0.8 + np.sin(progress * np.pi) * 0.2
    opacity = min(progress * 3, 1)
    
    # Charger une police
    try:
        font_large = ImageFont.truetype("arial.ttf", int(80 * scale))
        font_medium = ImageFont.truetype("arial.ttf", int(60 * scale))
        font_small = ImageFont.truetype("arial.ttf", 24)
    except:
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Texte principal
    text1 = "Mais qui est"
    text2 = "LE LOUP ? 🐺"
    
    # Centrer le texte
    bbox1 = draw.textbbox((0, 0), text1, font=font_medium)
    bbox2 = draw.textbbox((0, 0), text2, font=font_large)
    
    x1 = (WIDTH - (bbox1[2] - bbox1[0])) // 2
    y1 = HEIGHT // 2 - 70
    x2 = (WIDTH - (bbox2[2] - bbox2[0])) // 2
    y2 = HEIGHT // 2 + 10
    
    # Ombre du texte
    shadow_offset = 3
    text_color_with_alpha = (
        int(TEXT_COLOR[0] * opacity),
        int(TEXT_COLOR[1] * opacity),
        int(TEXT_COLOR[2] * opacity)
    )
    
    # Dessiner l'ombre
    draw.text((x1 + shadow_offset, y1 + shadow_offset), text1, 
              fill=TEXT_SHADOW, font=font_medium)
    draw.text((x2 + shadow_offset, y2 + shadow_offset), text2, 
              fill=TEXT_SHADOW, font=font_large)
    
    # Dessiner le texte
    draw.text((x1, y1), text1, fill=text_color_with_alpha, font=font_medium)
    
    text2_color = (
        int(220 * opacity),
        int(38 * opacity),
        int(38 * opacity)
    )
    draw.text((x2, y2), text2, fill=text2_color, font=font_large)
    
    # Sous-titre
    if progress > 0.3:
        subtitle = "Une production Loup-Garou Online"
        sub_opacity = int(156 * (progress - 0.3) * 2)
        bbox_sub = draw.textbbox((0, 0), subtitle, font=font_small)
        x_sub = (WIDTH - (bbox_sub[2] - bbox_sub[0])) // 2
        draw.text((x_sub, HEIGHT - 50), subtitle, 
                 fill=(sub_opacity, sub_opacity, sub_opacity), font=font_small)
    
    # Convertir en array OpenCV
    frame = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    frames.append(frame)
    
    if (frame_num + 1) % 10 == 0:
        print(f"  Frame {frame_num + 1}/{TOTAL_FRAMES}")

print("✅ Frames générés")

# 3. Créer la vidéo
print("\n📼 Création de la vidéo...")
video_temp = os.path.join(output_dir, "temp_video.mp4")
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
video_writer = cv2.VideoWriter(video_temp, fourcc, FPS, (WIDTH, HEIGHT))

for frame in frames:
    video_writer.write(frame)

video_writer.release()
print(f"✅ Vidéo temporaire créée: {video_temp}")

# 4. Combiner vidéo et audio avec FFmpeg (si disponible)
output_file = os.path.join(output_dir, "intro.webm")

print("\n🔧 Tentative de fusion audio/vidéo avec FFmpeg...")
try:
    # Essayer d'utiliser FFmpeg pour combiner audio et vidéo
    cmd = f'ffmpeg -y -i "{video_temp}" -i "{audio_file}" -c:v libvpx-vp9 -c:a libopus -shortest "{output_file}"'
    result = os.system(cmd)
    
    if result == 0:
        print(f"✅ Vidéo finale créée: {output_file}")
        # Nettoyer les fichiers temporaires
        os.remove(video_temp)
        os.remove(audio_file)
    else:
        raise Exception("FFmpeg non disponible")
except:
    print("⚠️  FFmpeg non disponible")
    print(f"📦 Vidéo sans audio sauvegardée: {video_temp}")
    print(f"🎙️  Fichier audio séparé: {audio_file}")
    print("\n💡 Pour combiner audio/vidéo, installez FFmpeg:")
    print("   https://ffmpeg.org/download.html")
    print("\n   Ou utilisez ce site: https://www.kapwing.com/tools/add-audio-to-video")

print("\n🎉 Génération terminée!")
