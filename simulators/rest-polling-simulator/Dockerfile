FROM python:3.10-slim

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn pyyaml pydantic

COPY app.py /app/
COPY config.yaml /app/

EXPOSE 8081

CMD ["python", "app.py"]
