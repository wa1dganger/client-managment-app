#!/bin/sh
set -eu

# =========================================================
# Named volume монтируется как root:root. Наш процесс бежит
# от nodeuser (UID 1001) и не сможет писать в /var/log/backend.
# Меняем владельца — это можно, потому что entrypoint стартует от root.
# =========================================================
LOG_DIR="${LOG_DIR:-/var/log/backend}"
mkdir -p "$LOG_DIR"
chown -R nodeuser:nodeuser "$LOG_DIR"

# =========================================================
# exec — заменяет процесс на node. Это критично:
# PID 1 = node, значит SIGTERM от docker stop придёт напрямую node,
# а не shell-обёртке. Обработчики SIGTERM в server.js сработают.
# =========================================================
exec su-exec nodeuser:nodeuser node server.js
