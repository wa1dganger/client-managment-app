# =========================================================
# Stage 1: deps — установка production-зависимостей
# =========================================================
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production


# =========================================================
# Stage 2: runner — production-образ
# =========================================================
FROM node:20-alpine AS runner

# su-exec — утилита для сброса привилегий (аналог gosu).
# Нужна, потому что entrypoint стартует от root (чтобы сделать chown на volume),
# а потом должен запустить node от nodeuser.
RUN apk add --no-cache su-exec

ENV NODE_ENV=production
WORKDIR /app

# Создаём непривилегированного пользователя
RUN addgroup -g 1001 -S nodeuser && \
    adduser  -u 1001 -S nodeuser -G nodeuser

# Создаём директорию для логов и отдаём её nodeuser.
# Важно: при первом монтировании named volume содержимое из образа
# копируется в volume, включая владельца. Так nodeuser получит доступ.
RUN mkdir -p /var/log/backend \
    && chown -R nodeuser:nodeuser /var/log/backend

# Права на рабочую директорию
RUN chown -R nodeuser:nodeuser /app

# Зависимости из deps
COPY --chown=nodeuser:nodeuser --from=deps /app/node_modules ./node_modules

# Исходники
COPY --chown=nodeuser:nodeuser . .

# entrypoint — стартует от root, чтобы сделать chown на volume,
# потом сбрасывает права через su-exec.
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3001

# ВАЖНО: НЕ используем USER nodeuser в конце.
# Entrypoint стартует от root, чтобы иметь возможность chown на volume.
# Права сбрасываются внутри entrypoint через su-exec.
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
