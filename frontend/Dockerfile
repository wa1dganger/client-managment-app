# 1 Deps Stage
FROM node:20-alpine AS deps
# Установка рабочей директории
WORKDIR /app
# Копирование файлов зависимостей
COPY package*.json ./
# Установка зависимостей
RUN npm ci --include=dev


# 2 Builder Stage
FROM node:20-alpine AS builder
# Устанвока рабочей директории
WORKDIR /app
# Переиспользование node_modules из deps (не ставим повторно)
COPY --from=deps /app/node_modules ./node_modules
# Копирование исходного кода
COPY . .
# CI=false — чтобы предупреждения ESLint не валили сборку в образе
ENV CI=false
# Сборка приложения
RUN npm run build


# 3 Runner Stage
FROM nginx:alpine AS runner
# Чистка дефолтной статики и конфига nginx
RUN rm -rf /usr/share/nginx/html/* \
    && rm -f /etc/nginx/conf.d/default.conf
# Копирование собранной статики
COPY --from=builder /app/build /usr/share/nginx/html
# Копирование кастомного конфига
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копирование TLS-сертификата в образ
COPY certs/cert.pem /etc/nginx/certs/cert.pem
COPY certs/key.pem  /etc/nginx/certs/key.pem

# Назначение прав доступа, воркеры наследуют дескриптор от мастера
RUN chmod 644 /etc/nginx/certs/cert.pem \
    && chmod 640 /etc/nginx/certs/key.pem

# Назначение порта
# Теперь nginx слушает и HTTP (80), и HTTPS (443)
EXPOSE 80 443

# Запуск приложения
CMD ["nginx", "-g", "daemon off;"]
