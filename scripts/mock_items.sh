#!/usr/bin/env bash
set -euo pipefail

# Locate project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Force UTF-8 encoding for Python on Windows (prevents Thai character corruption under cp1252/cp874)
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

# Remember caller-provided APP_ENV if specified
CALLER_APP_ENV="${APP_ENV:-}"

# Load .env file if available
if [ -f "${ROOT_DIR}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

# Caller-provided APP_ENV takes precedence over .env file
if [ -n "${CALLER_APP_ENV}" ]; then
  APP_ENV="${CALLER_APP_ENV}"
fi

APP_ENV="${APP_ENV:-demo}"
BACKEND_PORT="${BACKEND_PORT:-8080}"
BACKEND_URL="${BACKEND_URL:-http://localhost:${BACKEND_PORT}}"
DEMO_PASSWORD="${DEMO_DEFAULT_PASSWORD:-password123}"

# 1. Guard against running in production environment (case-insensitive)
APP_ENV_LOWER="$(echo "${APP_ENV}" | tr '[:upper:]' '[:lower:]')"
if [ "${APP_ENV_LOWER}" = "prod" ] || [ "${APP_ENV_LOWER}" = "production" ]; then
  echo "==========================================================" >&2
  echo "[BLOCKED] Mock data generation is prohibited in production mode!" >&2
  echo "Current APP_ENV='${APP_ENV}'" >&2
  echo "==========================================================" >&2
  exit 1
fi

echo "==> Environment check passed: APP_ENV='${APP_ENV}'"
echo "==> Target backend: ${BACKEND_URL}"

# 2. Check Backend availability
if ! curl -s -f -m 3 "${BACKEND_URL}/api/items" >/dev/null 2>&1; then
  echo "Error: Backend service is not responding at ${BACKEND_URL}." >&2
  echo "Please start the backend first (e.g. 'make backend' or 'make up')." >&2
  exit 1
fi

# 3. Detect a working JSON runtime (verify execution to skip Windows Store python3 stub)
JSON_TOOL="awk"
if command -v node >/dev/null 2>&1 && node -e "process.exit(0)" >/dev/null 2>&1; then
  JSON_TOOL="node"
elif command -v python3 >/dev/null 2>&1 && python3 -c "import sys; sys.exit(0)" >/dev/null 2>&1; then
  JSON_TOOL="python3"
elif command -v python >/dev/null 2>&1 && python -c "import sys; sys.exit(0)" >/dev/null 2>&1; then
  JSON_TOOL="python"
elif command -v jq >/dev/null 2>&1 && echo '{}' | jq -e . >/dev/null 2>&1; then
  JSON_TOOL="jq"
fi

# Helper to extract json field
extract_json_field() {
  local json="$1"
  local field="$2"
  case "${JSON_TOOL}" in
    node)
      printf '%s' "$json" | node -e '
const fs = require("fs");
try {
  const data = JSON.parse(fs.readFileSync(0, "utf8"));
  const val = data[process.argv[1]];
  process.stdout.write(val != null ? String(val) : "");
} catch (e) {}
' "$field"
      ;;
    python3|python)
      printf '%s' "$json" | "${JSON_TOOL}" -c 'import sys, json; data=json.load(sys.stdin); print(data.get(sys.argv[1], "") or "")' "$field" 2>/dev/null || true
      ;;
    jq)
      printf '%s' "$json" | jq -r ".${field} // empty"
      ;;
    *)
      printf '%s' "$json" | grep -o "\"${field}\":\"[^\"]*" | head -n 1 | cut -d'"' -f4
      ;;
  esac
}

# Calculate availability window (from today until +30 days)
if [ "${JSON_TOOL}" = "node" ]; then
  AVAIL_FROM=$(node -e 'console.log(new Date().toISOString().slice(0, 10) + "T00:00:00")')
  AVAIL_UNTIL=$(node -e 'const d = new Date(); d.setDate(d.getDate() + 30); console.log(d.toISOString().slice(0, 10) + "T23:59:59")')
elif [ "${JSON_TOOL}" = "python3" ] || [ "${JSON_TOOL}" = "python" ]; then
  AVAIL_FROM=$("${JSON_TOOL}" -c "import datetime; print(datetime.date.today().isoformat() + 'T00:00:00')")
  AVAIL_UNTIL=$("${JSON_TOOL}" -c "import datetime; print((datetime.date.today() + datetime.timedelta(days=30)).isoformat() + 'T23:59:59')")
elif date -v+30d >/dev/null 2>&1; then
  AVAIL_FROM="$(date +"%Y-%m-%d")T00:00:00"
  AVAIL_UNTIL="$(date -v+30d +"%Y-%m-%d")T23:59:59"
else
  AVAIL_FROM="$(date +"%Y-%m-%d")T00:00:00"
  AVAIL_UNTIL="$(date -d "+30 days" +"%Y-%m-%d" 2>/dev/null || date +"%Y-%m-%d")T23:59:59"
fi

# Fetch existing items list for idempotency (fail loudly instead of creating duplicates)
if ! EXISTING_ITEMS=$(curl -s -f "${BACKEND_URL}/api/items/all"); then
  echo "Error: Failed to fetch existing items from ${BACKEND_URL}/api/items/all." >&2
  exit 1
fi

item_already_exists() {
  local student_id="$1"
  local title="$2"
  case "${JSON_TOOL}" in
    node)
      printf '%s' "$EXISTING_ITEMS" | node -e '
const fs = require("fs");
try {
  const items = JSON.parse(fs.readFileSync(0, "utf8"));
  const exists = Array.isArray(items) && items.some(
    (item) => item.ownerId === process.argv[1] && item.title === process.argv[2] && item.deletedAt == null
  );
  process.exit(exists ? 0 : 1);
} catch (e) {
  process.exit(1);
}
' "$student_id" "$title"
      ;;
    python3|python)
      printf '%s' "$EXISTING_ITEMS" | "${JSON_TOOL}" -c '
import sys, json
try:
    items = json.load(sys.stdin)
    exists = any(item.get("ownerId") == sys.argv[1] and item.get("title") == sys.argv[2] and item.get("deletedAt") is None for item in items)
    sys.exit(0 if exists else 1)
except Exception:
    sys.exit(1)
' "$student_id" "$title"
      ;;
    jq)
      printf '%s' "$EXISTING_ITEMS" | jq -e --arg owner "$student_id" --arg title "$title" \
        'any(.[]; .ownerId == $owner and .title == $title and .deletedAt == null)' >/dev/null 2>&1
      ;;
    *)
      # Portable AWK fallback (works on macOS BSD, Linux, and Windows Git Bash)
      printf '%s' "$EXISTING_ITEMS" | tr -d '\r\n' | awk -v owner="\"ownerId\":\"${student_id}\"" -v title="\"title\":\"${title}\"" '
BEGIN { found = 0 }
{
  gsub(/\},\{/, "}\n{")
  n = split($0, lines, "\n")
  for (i = 1; i <= n; i++) {
    if (index(lines[i], owner) > 0 && index(lines[i], title) > 0 && index(lines[i], "\"deletedAt\":null") > 0) {
      found = 1
      break
    }
  }
}
END { exit (found ? 0 : 1) }
'
      ;;
  esac
}

# 4. Define mock items per demo account
# Format: studentId|category|title|description
MOCK_DATA=(
  "6809000001|ELECTRONICS|iPad Air 5 พร้อม Apple Pencil|iPad Air 5 ชิป M1 พร้อม Apple Pencil 2 มี GoodNotes เหมาะสำหรับจดเลคเชอร์และอ่านสไลด์เรียน"
  "6809000001|STUDY|เครื่องคิดเลขวิทยาศาสตร์ Casio FX-991EX|เครื่องคิดเลขวิทยาศาสตร์ สภาพดีเยี่ยม จอแสดงผลชัดเจน รองรับการคำนวณเมทริกซ์และสถิติ"
  "6809000002|ELECTRONICS|สายแปลง USB-C to HDMI Multiport Adapter|หัวแปลง Type-C เป็น HDMI รองรับ 4K ต่อโปรเจกเตอร์หรือจอมอนิเตอร์สำหรับพรีเซนต์งานกลุ่ม"
  "6809000002|STUDY|หนังสือประมวลกฎหมายแพ่งและพาณิชย์|หนังสือประมวลกฎหมายแพ่งและพาณิชย์ เล่มกะทัดรัด พกพาสะดวก เหมาะสำหรับนักศึกษาคณะนิติศาสตร์"
  "6809000003|ELECTRONICS|กล้องดิจิทัล Sony ZV-E10 Kit 16-50mm|กล้อง Mirrorless ความละเอียดสูง เหมาะสำหรับถ่ายวิดีโอโครงงาน ทำ Vlog พร้อมแบตเตอรี่ 2 ก้อน"
  "6809000003|SPORTS|ลูกบาสเกตบอล Molten BG3800 เบอร์ 7|ลูกบาสเกตบอลหนัง PU ผิวสัมผัสกระชับมือ เหมาะสำหรับเล่นสนามในร่มและกลางแจ้ง"
)

# Helper functions to store and retrieve token (portable across Bash 3.x and 4+)
get_cached_token() {
  local student_id="$1"
  eval "echo \"\${TOKEN_${student_id}:-}\""
}

set_cached_token() {
  local student_id="$1"
  local token="$2"
  eval "TOKEN_${student_id}=\"\$token\""
}

login_student() {
  local student_id="$1"
  local cached
  cached="$(get_cached_token "$student_id")"
  if [ -n "$cached" ]; then
    return 0
  fi

  echo -n "==> Logging in as ${student_id}... "
  local login_res
  login_res=$(curl -s -X POST "${BACKEND_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"studentId\":\"${student_id}\",\"password\":\"${DEMO_PASSWORD}\"}")

  local token
  token=$(extract_json_field "${login_res}" "accessToken")

  if [ -z "${token}" ]; then
    echo "FAILED" >&2
    echo "Response: ${login_res}" >&2
    return 1
  fi

  echo "SUCCESS"
  set_cached_token "$student_id" "$token"
}

build_payload() {
  local title="$1"
  local category="$2"
  local description="$3"

  case "${JSON_TOOL}" in
    node)
      node -e '
console.log(JSON.stringify({
  title: process.argv[1],
  category: process.argv[2],
  description: process.argv[3],
  availableFrom: process.argv[4],
  availableUntil: process.argv[5]
}));
' "$title" "$category" "$description" "$AVAIL_FROM" "$AVAIL_UNTIL"
      ;;
    python3|python)
      "${JSON_TOOL}" -c '
import sys, json
print(json.dumps({
    "title": sys.argv[1],
    "category": sys.argv[2],
    "description": sys.argv[3],
    "availableFrom": sys.argv[4],
    "availableUntil": sys.argv[5]
}, ensure_ascii=False))' "$title" "$category" "$description" "$AVAIL_FROM" "$AVAIL_UNTIL"
      ;;
    jq)
      jq -n -c \
        --arg title "$title" \
        --arg category "$category" \
        --arg description "$description" \
        --arg availableFrom "$AVAIL_FROM" \
        --arg availableUntil "$AVAIL_UNTIL" \
        '{title: $title, category: $category, description: $description, availableFrom: $availableFrom, availableUntil: $availableUntil}'
      ;;
    *)
      printf '{"title":"%s","category":"%s","description":"%s","availableFrom":"%s","availableUntil":"%s"}' \
        "$title" "$category" "$description" "$AVAIL_FROM" "$AVAIL_UNTIL"
      ;;
  esac
}

create_item() {
  local student_id="$1"
  local category="$2"
  local title="$3"
  local description="$4"

  if item_already_exists "${student_id}" "${title}"; then
    echo "  - [SKIP] '${title}' already exists for ${student_id}"
    return 0
  fi

  login_student "${student_id}"
  local token
  token="$(get_cached_token "$student_id")"

  local payload
  payload=$(build_payload "$title" "$category" "$description")

  local res
  res=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/items" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d "${payload}")

  local http_code
  http_code=$(echo "$res" | tail -n1)
  local body
  body=$(echo "$res" | sed '$d')

  if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
    local item_id
    item_id=$(extract_json_field "$body" "id")
    echo "  + [CREATED] '${title}' (${category}) [id: ${item_id}]"
  else
    echo "  x [ERROR] Failed to create '${title}' (HTTP ${http_code}): ${body}" >&2
    return 1
  fi
}

echo "==> Seeding mock items via API (JSON tool: ${JSON_TOOL})..."
for entry in "${MOCK_DATA[@]}"; do
  IFS="|" read -r student_id category title description <<< "$entry"
  student_id="${student_id%$'\r'}"
  category="${category%$'\r'}"
  title="${title%$'\r'}"
  description="${description%$'\r'}"
  create_item "$student_id" "$category" "$title" "$description"
done

echo "==> Mock items generation complete!"
