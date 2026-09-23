# Database: PostgreSQL 16 на Alpine
FROM postgres:16-alpine

# Метаданные образа (для docker inspect)
LABEL maintainer="crm-app" \
      description="PostgreSQL 16 for CRM client management"

# Копирование скрипта инициализации
COPY init.sql /docker-entrypoint-initdb.d/init.sql

# Назначение прав пользователю
RUN chown postgres:postgres /docker-entrypoint-initdb.d/init.sql \
    && chmod 644 /docker-entrypoint-initdb.d/init.sql

# Проверка статуса работоспособности
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD pg_isready -U postgres -q || exit 1

# Объявление порта
EXPOSE 5432

# Переключние на непривилегированного пользователя
USER postgres

# Запуск программы
CMD ["postgres"]
