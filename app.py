import edge_tts
import asyncio
import tempfile
import os
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
from typing import Dict, List, Optional
import json

# Модели данных для API
class TTSRequest(BaseModel):
    text: str
    voice: str
    rate: int = 0
    pitch: int = 0

# Получаем список голосов и организуем их по языкам
async def get_organized_voices():
    voices = await edge_tts.list_voices()
    
    # Языки и их коды
    language_names = {
        "ru": "Russian",
        "en": "English", 
        "de": "German",
        "fr": "French",
        "es": "Spanish",
        "it": "Italian",
        "ja": "Japanese",
        "ko": "Korean",
        "zh": "Chinese",
        "pt": "Portuguese",
        "nl": "Dutch",
        "pl": "Polish",
        "tr": "Turkish",
        "ar": "Arabic",
        "hi": "Hindi"
    }
    
    # Группируем голоса по языкам
    voices_by_language = {}
    all_voices_list = []
    
    for voice in voices:
        short_name = voice['ShortName']
        locale = voice['Locale']
        
        # Определяем язык по коду
        lang_code = locale.split('-')[0].lower()
        language_name = language_names.get(lang_code, "Other")
        
        if language_name not in voices_by_language:
            voices_by_language[language_name] = []
        
        # Упрощаем название голоса
        # Было: "Microsoft Adri Online (Natural) - Afrikaans (South Africa) - af-ZA (Female)"
        # Стало: "Adri - Afrikaans (South Africa) - Female"
        friendly_name = voice['FriendlyName']
        # Убираем "Microsoft" и "Online (Natural)"
        if friendly_name.startswith("Microsoft "):
            friendly_name = friendly_name[10:]  # Убираем "Microsoft "
        if " Online (Natural)" in friendly_name:
            friendly_name = friendly_name.replace(" Online (Natural)", "")
        
        voice_info = {
            "id": short_name,
            "name": f"{friendly_name} - {voice['Locale']} ({voice['Gender']})",
            "locale": locale,
            "gender": voice['Gender'],
            "language": language_name,
            "country": voice['Locale'].split('-')[1] if '-' in locale else ""
        }
        
        voices_by_language[language_name].append(voice_info)
        all_voices_list.append(voice_info)
    
    # Сортируем языки и голоса внутри языков
    sorted_languages = dict(sorted(voices_by_language.items()))
    for language in sorted_languages:
        sorted_languages[language].sort(key=lambda x: x["name"])
    
    return sorted_languages, all_voices_list

# Получаем данные при запуске
VOICES_BY_LANGUAGE, ALL_VOICES = asyncio.run(get_organized_voices())

async def tts(text: str, voice: str, rate: int = 0, pitch: int = 0):
    """Основная функция TTS"""
    if not text.strip():
        raise ValueError("Текст не может быть пустым")
    
    com = edge_tts.Communicate(text, voice, rate=f"{rate:+d}%", pitch=f"{pitch:+d}Hz")
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    await com.save(tmp.name)
    return tmp.name

# Создаем FastAPI приложение
app = FastAPI(
    title="Edge TTS Pro API",
    version="2.0.0",
    description="Профессиональная озвучка текста на базе Microsoft Edge TTS. Разработано Anik Beris (Андрей Аникин)",
    contact={
        "name": "Anik Beris (Андрей Аникин)",
        "url": "https://github.com/AnikBeris"
    }
)

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Статические файлы (фронтенд)
app.mount("/static", StaticFiles(directory="static"), name="static")

# API Endpoints
@app.get("/")
async def serve_frontend():
    """Отдаем фронтенд"""
    return FileResponse("static/index.html")

@app.get("/api/languages")
async def get_languages():
    """Получить список языков с количеством голосов"""
    languages_info = []
    for language, voices in VOICES_BY_LANGUAGE.items():
        languages_info.append({
            "name": language,
            "code": language,
            "count": len(voices)
        })
    
    return JSONResponse(content=sorted(languages_info, key=lambda x: x["name"]))

@app.get("/api/voices")
async def get_voices(language: Optional[str] = None):
    """Получить список голосов (можно отфильтровать по языку)"""
    if language and language in VOICES_BY_LANGUAGE:
        return JSONResponse(content=VOICES_BY_LANGUAGE[language])
    else:
        return JSONResponse(content=ALL_VOICES)

@app.get("/api/voices/{voice_id}")
async def get_voice_info(voice_id: str):
    """Получить информацию о конкретном голосе"""
    for voice in ALL_VOICES:
        if voice["id"] == voice_id:
            return JSONResponse(content=voice)
    raise HTTPException(status_code=404, detail="Голос не найден")

@app.post("/api/tts")
async def generate_tts(
    request: TTSRequest,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Сгенерировать речь из текста"""
    try:
        # Валидация
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Текст не может быть пустым")
        
        # Проверяем, существует ли голос
        voice_exists = any(voice["id"] == request.voice for voice in ALL_VOICES)
        if not voice_exists:
            raise HTTPException(status_code=400, detail="Выбранный голос не найден")
        
        # Генерация речи
        path = await tts(
            text=request.text, 
            voice=request.voice, 
            rate=request.rate, 
            pitch=request.pitch
        )
        
        # Очистка файла после отправки
        background_tasks.add_task(os.unlink, path)
        
        # Возвращаем аудио файл
        return FileResponse(
            path,
            media_type="audio/mpeg",
            filename="speech.mp3",
            headers={"Content-Disposition": "attachment; filename=speech.mp3"}
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации речи: {str(e)}")

@app.get("/api/health")
async def health_check():
    """Проверка работы API"""
    total_voices = sum(len(voices) for voices in VOICES_BY_LANGUAGE.values())
    return {
        "status": "ok", 
        "service": "Edge TTS Pro", 
        "version": "2.0.0",
        "developer": "Anik Beris (Андрей Аникин)",
        "languages_count": len(VOICES_BY_LANGUAGE),
        "voices_count": total_voices,
        "languages": list(VOICES_BY_LANGUAGE.keys())
    }

@app.get("/api/stats")
async def get_stats():
    """Получить статистику по голосам"""
    stats = {}
    for language, voices in VOICES_BY_LANGUAGE.items():
        male_count = len([v for v in voices if v["gender"] == "Male"])
        female_count = len([v for v in voices if v["gender"] == "Female"])
        stats[language] = {
            "total": len(voices),
            "male": male_count,
            "female": female_count,
            "voices": [v["id"] for v in voices[:5]]
        }
    
    return JSONResponse(content=stats)

# Если запускаем напрямую
if __name__ == "__main__":
    total_voices = sum(len(voices) for voices in VOICES_BY_LANGUAGE.values())
    
    print("=" * 60)
    print("EDGE TTS PRO v2.0.0")
    print("Разработано Anik Beris (Андрей Аникин)")
    print("=" * 60)
    print(f"Доступно языков: {len(VOICES_BY_LANGUAGE)}")
    print(f"Всего голосов: {total_voices}")
    print("\nЯзыки и количество голосов:")
    for language, voices in sorted(VOICES_BY_LANGUAGE.items()):
        print(f"  • {language}: {len(voices)} голосов")
    print("\nAPI Endpoints:")
    print("  • Фронтенд: http://127.0.0.1:8000")
    print("  • Документация: http://127.0.0.1:8000/docs")
    print("  • API TTS: POST http://127.0.0.1:8000/api/tts")
    print("  • Список языков: GET http://127.0.0.1:8000/api/languages")
    print("  • Статистика: GET http://127.0.0.1:8000/api/stats")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)