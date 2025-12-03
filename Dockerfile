# Используем официальный Python образ
FROM python:3.11-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    git \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Копируем файлы requirements.txt (если есть)
COPY requirements.txt* ./

# Устанавливаем Python зависимости
# Если requirements.txt существует, используем его, или устанавливаем edge-tts
RUN if [ -f requirements.txt ]; then \
        pip install --no-cache-dir -r requirements.txt; \
    else \
        pip install --no-cache-dir edge-tts; \
    fi

# Копируем весь проект
COPY . .

# Создаем директории для вывода
RUN mkdir -p /app/output

# Экспонируем порт (если приложение использует веб-сервер)
EXPOSE 5000

# Команда по умолчанию
# Замените на вашу команду запуска приложения
CMD ["python", "app.py"]