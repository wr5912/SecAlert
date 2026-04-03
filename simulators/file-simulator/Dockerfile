FROM python:3.10-slim

WORKDIR /app

RUN pip install --no-cache-dir pyyaml

COPY writer.py /app/
COPY config.yaml /app/
COPY vector.yml /app/

# 创建日志目录
RUN mkdir -p /app/logs

# Vector 镜像 (用于文件监控)
COPY --from=timberio/vector:0.28 /usr/bin/vector /usr/bin/vector

EXPOSE 9000

# 运行日志写入器 (后台) + Vector (前台)
CMD python writer.py &
exec vector --config /app/vector.yml
