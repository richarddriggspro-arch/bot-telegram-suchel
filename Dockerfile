FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# El bot escucha en $PORT solo para el health check; el trabajo real es por polling.
EXPOSE 8080

CMD ["python", "bot.py"]
