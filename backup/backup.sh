#!/bin/sh
set -eu

# =========================================================
# Значения по умолчанию — на случай, если env не проброшен.
# : "${VAR:=default}" — присвоить, если пусто.
# =========================================================
: "${DB_HOST:=database}"
: "${DB_PORT:=5432}"
: "${DB_USER:=postgres}"
: "${DB_NAME:=crm_db}"
: "${BACKUP_INTERVAL:=86400}"    # раз в сутки
: "${BACKUP_KEEP:=7}"            # хранить 7 последних дампов
: "${BACKUP_DIR:=/backups}"

mkdir -p "$BACKUP_DIR"

echo "[backup] started"
echo "[backup]   host=$DB_HOST port=$DB_PORT db=$DB_NAME user=$DB_USER"
echo "[backup]   interval=${BACKUP_INTERVAL}s keep=$BACKUP_KEEP dir=$BACKUP_DIR"

# =========================================================
# Бесконечный цикл бэкапа
# =========================================================
while true; do
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

    echo "[backup] dumping to $FILE"

    # PGPASSWORD читается pg_dump'ом автоматически из env.
    # --no-owner --no-privileges делают дамп переносимым между инстансами
    # (не привязан к конкретным ролям и правам).
    # | gzip — сжатие на лету, дампы Postgres сжимаются в 5-10 раз.
    if PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --no-owner --no-privileges \
            | gzip > "$FILE"; then
        SIZE=$(du -h "$FILE" | cut -f1)
        echo "[backup] OK: $FILE ($SIZE)"
    else
        echo "[backup] FAILED — removing partial file"
        rm -f "$FILE"
    fi

    # =========================================================
    # Ротация: оставляем только $BACKUP_KEEP последних файлов.
    # ls -1t — по одному имени в строке, сортировка по времени (новые первыми).
    # tail -n +N — начиная с N-й строки (то есть пропустить первые N-1).
    # xargs -r — не запускать rm, если список пуст.
    # =========================================================
    ls -1t "$BACKUP_DIR"/${DB_NAME}_*.sql.gz 2>/dev/null \
        | tail -n +$((BACKUP_KEEP + 1)) \
        | xargs -r rm -f

    echo "[backup] sleeping ${BACKUP_INTERVAL}s..."
    sleep "$BACKUP_INTERVAL"
done
