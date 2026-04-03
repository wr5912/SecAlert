FROM python:3.10-slim

WORKDIR /app

RUN pip install --no-cache-dir pyyaml

COPY server.py /app/
COPY config.yaml /app/

EXPOSE 1514/UDP 1514/TCP

CMD ["python", "server.py"]
