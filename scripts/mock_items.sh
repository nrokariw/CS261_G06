#!/usr/bin/env bash
set -euo pipefail

# Locate project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Remember caller-provided APP_ENV if specified
CALLER_APP_ENV="${APP_ENV:-}"

# Load .env file if available
if [ -f "${ROOT_DIR}/.env" ]; then
  # Load env variables ignoring comments
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

# 1. Guard against running in production environment
if [ "${APP_ENV}" = "prod" ] || [ "${APP_ENV}" = "production" ]; then
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

# Helper to extract json field
extract_json_field() {
  local json="$1"
  local field="$2"
  if command -v jq >/dev/null 2>&1; then
    echo "$json" | jq -r ".${field} // empty"
  elif command -v python3 >/dev/null 2>&1; then
    echo "$json" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('${field}', ''))" 2>/dev/null || true
  else
    echo "$json" | grep -o "\"${field}\":\"[^\"]*" | head -n 1 | cut -d'"' -f4
  fi
}

# Calculate availability window (from today until +30 days)
if command -v python3 >/dev/null 2>&1; then
  AVAIL_FROM=$(python3 -c "import datetime; print(datetime.date.today().isoformat() + 'T00:00:00')")
  AVAIL_UNTIL=$(python3 -c "import datetime; print((datetime.date.today() + datetime.timedelta(days=30)).isoformat() + 'T23:59:59')")
elif date -v+30d >/dev/null 2>&1; then
  AVAIL_FROM="$(date +"%Y-%m-%d")T00:00:00"
  AVAIL_UNTIL="$(date -v+30d +"%Y-%m-%d")T23:59:59"
else
  AVAIL_FROM="$(date +"%Y-%m-%d")T00:00:00"
  AVAIL_UNTIL="$(date -d "+30 days" +"%Y-%m-%d" 2>/dev/null || date +"%Y-%m-%d")T23:59:59"
fi

# Fetch existing items list for idempotency
EXISTING_ITEMS=$(curl -s "${BACKEND_URL}/api/items/all" || echo "[]")

item_already_exists() {
  local student_id="$1"
  local title="$2"
  if command -v python3 >/dev/null 2>&1; then
    python3 -c "import sys, json
items = json.loads('''$EXISTING_ITEMS''')
exists = any(item.get('ownerId') == '$student_id' and item.get('title') == '$title' and item.get('deletedAt') is None for item in items)
sys.exit(0 if exists else 1)
" 2>/dev/null
  else
    # Simple grep fallback
    echo "$EXISTING_ITEMS" | grep -F "\"ownerId\":\"$student_id\"" | grep -F "\"title\":\"$title\"" >/dev/null 2>&1
  fi
}

# 3. Define mock items per demo account
# Format: studentId|category|title|description
MOCK_DATA=(
  "6809000001|ELECTRONICS|iPad Air 5 พร้อม Apple Pencil|iPad Air 5 ชิป M1 พร้อม Apple Pencil 2 มี GoodNotes เหมาะสำหรับจดเลคเชอร์และอ่านสไลด์เรียน"
  "6809000001|STUDY|เครื่องคิดเลขวิทยาศาสตร์ Casio FX-991EX|เครื่องคิดเลขวิทยาศาสตร์ สภาพดีเยี่ยม จอแสดงผลชัดเจน รองรับการคำนวณเมทริกซ์และสถิติ"
  "6809000002|ELECTRONICS|สายแปลง USB-C to HDMI Multiport Adapter|หัวแปลง Type-C เป็น HDMI รองรับ 4K ต่อโปรเจกเตอร์หรือจอมอนิเตอร์สำหรับพรีเซนต์งานกลุ่ม"
  "6809000002|STUDY|หนังสือประมวลกฎหมายแพ่งและพาณิชย์|หนังสือประมวลกฎหมายแพ่งและพาณิชย์ เล่มกะทัดรัด พกพาสะดวก เหมาะสำหรับนักศึกษาคณะนิติศาสตร์"
  "6809000003|ELECTRONICS|กล้องดิจิทัล Sony ZV-E10 Kit 16-50mm|กล้อง Mirrorless ความละเอียดสูง เหมาะสำหรับถ่ายวิดีโอโครงงาน ทำ Vlog พร้อมแบตเตอรี่ 2 ก้อน"
  "6809000003|SPORTS|ลูกบาสเกตบอล Molten BG3800 เบอร์ 7|ลูกบาสเกตบอลหนัง PU ผิวสัมผัสกระชับมือ เหมาะสำหรับเล่นสนามในร่มและกลางแจ้ง"
)

# Cache JWT tokens by studentId
declare -A TOKENS=()

login_student() {
  local student_id="$1"
  if [[ -n "${TOKENS[$student_id]:-}" ]]; then
    return 0
  fi

  echo -n "==> Logging in as ${student_id}... "
  local login_res
  login_res=$(curl -s -X POST "${BACKEND_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"studentId\":\"${student_id}\",\"password\":\"${DEMO_PASSWORD}\"}")

  local token
  token=$(extract_json_field "${login_res}" "accessToken")

  if [[ -z "${token}" ]]; then
    echo "FAILED" >&2
    echo "Response: ${login_res}" >&2
    return 1
  fi

  echo "SUCCESS"
  TOKENS["$student_id"]="$token"
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
  local token="${TOKENS[$student_id]}"

  local payload
  if command -v python3 >/dev/null 2>&1; then
    payload=$(python3 -c "import json
print(json.dumps({
    'title': '''$title''',
    'category': '''$category''',
    'description': '''$description''',
    'availableFrom': '$AVAIL_FROM',
    'availableUntil': '$AVAIL_UNTIL'
}))")
  else
    payload=$(printf '{"title":"%s","category":"%s","description":"%s","availableFrom":"%s","availableUntil":"%s"}' \
      "$title" "$category" "$description" "$AVAIL_FROM" "$AVAIL_UNTIL")
  fi

  local res
  res=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/items" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "${payload}")

  local http_code
  http_code=$(echo "$res" | tail -n1)
  local body
  body=$(echo "$res" | sed '$d')

  if [[ "$http_code" == "201" ]] || [[ "$http_code" == "200" ]]; then
    local item_id
    item_id=$(extract_json_field "$body" "id")
    echo "  + [CREATED] '${title}' (${category}) [id: ${item_id}]"
  else
    echo "  x [ERROR] Failed to create '${title}' (HTTP ${http_code}): ${body}" >&2
    return 1
  fi
}

echo "==> Seeding mock items via API..."
for entry in "${MOCK_DATA[@]}"; do
  IFS="|" read -r student_id category title description <<< "$entry"
  create_item "$student_id" "$category" "$title" "$description"
done

echo "==> Mock items generation complete!"
