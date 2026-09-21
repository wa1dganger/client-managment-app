# 1 Build Stage

FROM node:20-alpine AS builder
# Установка рабочей директории
WORKDIR /app
# Копирование файлов зависимостей 
COPY package*.json ./
# Установка production зависимостей
RUN npm ci --only=production

# 2 Product Stage

FROM node:20-alpine AS runner
# Назначение переменной окружения 
ENV NODE_ENV=production
# Установка рабочей директории
WORKDIR /app
# Создание непривелегированного пользователя
RUN addgroup -g 1001 -S nodeuser && \
	adduser -u 1001 -S nodeuser -G nodeuser
# Смена владельца рабочей директории
RUN chown -R nodeuser:nodeuser /app
# Копирование файлов зависиостей из builder и назначение прав пользователю
COPY --chown=nodeuser:nodeuser --from=builder /app/node_modules ./node_modules
# Копирование исходного кода приложения
COPY --chown=nodeuser:nodeuser . .
# Переключение Docker на запуск от имени пользователя
USER nodeuser
# Назначение порта, который слушает Express
EXPOSE 3001
# Запуск приложения
CMD ["node", "server.js"]
