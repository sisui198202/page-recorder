#!/bin/bash
# PageRecorder の公開版を書き出す。
# Git 追跡ファイルだけを書き出し先へコピーし、ローカルパスと OAuth クライアントIDを置換したうえで、
# 公開前チェック（ローカルパス・クライアントID・個人メール・Webhook・秘密情報ファイル）を行う。
# 使い方: bash scripts/export-public.sh [書き出し先]   （省略時: $HOME/Work/Projects/PageRecorder-public）
set -euo pipefail

SRC_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$HOME/Work/Projects/PageRecorder-public}"
MARKER=".pagerecorder-public"
# 置換・検査に使うパス。リテラルで書くと、このスクリプト自身が検査に引っかかるため $HOME から組み立てる
HOME_PREFIX="$HOME/"
USERS_DIR="/$(basename "$(dirname "$HOME")")/"
CLIENT_ID_RE='[0-9]{8,}-[a-z0-9]{20,}\.apps\.googleusercontent\.com'

fail() { echo "❌ $*" >&2; exit 1; }

# 1. 実行場所の確認
cd "$SRC_ROOT"
[ -f manifest.json ] && grep -q '"name": "PageRecorder' manifest.json || fail "PageRecorder のリポジトリではありません: $SRC_ROOT"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Git リポジトリではありません: $SRC_ROOT"
for f in publish/README.public.md publish/LICENSE; do [ -f "$f" ] || fail "$f がありません"; done

# 2. 書き出し先の用意（目印ファイルの無い既存フォルダには書き込まない）
case "$DEST" in
  ""|"/"|"$HOME"|"$HOME/") fail "書き出し先が不正です: '$DEST'" ;;
esac
mkdir -p "$DEST"
DEST="$(cd "$DEST" && pwd)"
case "$DEST/" in
  "$SRC_ROOT"/*) fail "書き出し先をリポジトリの中にはできません: $DEST" ;;
esac
if [ -n "$(ls -A "$DEST")" ] && [ ! -f "$DEST/$MARKER" ]; then
  fail "書き出し先が空ではなく、目印ファイル $MARKER もありません。別のフォルダを壊さないよう中止します: $DEST"
fi
touch "$DEST/$MARKER"
# 前回の書き出し結果を消す（.git・node_modules・目印ファイルは残す）
find "$DEST" -mindepth 1 -maxdepth 1 ! -name .git ! -name node_modules ! -name "$MARKER" -exec rm -rf {} +

# 3. 追跡ファイルを除外リスト付きでコピー
#    除外: 参考/（購入フロー系資料）、*.pdf（置換できない派生物）、publish/（公開用ファイルの元）
git -c core.quotepath=off ls-files -z \
  | perl -0ne 'chomp; print "$_\0" unless m{^(参考/|publish/)|\.pdf$}i' \
  | rsync -a --from0 --files-from=- ./ "$DEST/"

# 4. README・LICENSE の差し替えと .gitignore の追記
cp publish/README.public.md "$DEST/README.md"
cp publish/LICENSE "$DEST/LICENSE"
printf '\n# 公開版\n/%s\nclient_secret_*.json\n' "$MARKER" >> "$DEST/.gitignore"

# 5. テキストファイルの置換（ローカルパス → ~/、クライアントID → YOUR_CLIENT_ID）
{ grep -rIlE --exclude-dir=.git --exclude-dir=node_modules -e "$HOME_PREFIX" -e "$CLIENT_ID_RE" "$DEST" || true; } \
  | while IFS= read -r file; do
      H="$HOME_PREFIX" perl -pi -e 's/\Q$ENV{H}\E/~\//g; s/[0-9]{8,}-[a-z0-9]{20,}\.apps\.googleusercontent\.com/YOUR_CLIENT_ID.apps.googleusercontent.com/g' "$file"
    done

# 6. 公開前チェック（ファイル名と件数だけを表示し、中身は表示しない）
count_files() { grep -rIlE --exclude-dir=.git --exclude-dir=node_modules -e "$1" "$DEST" || true; }
FOUND=0
report() {
  local label="$1" list="$2" n
  n=$(printf '%s' "$list" | grep -c . || true)
  echo "  - $label: $n 件"
  if [ "$n" -gt 0 ]; then
    printf '%s\n' "$list" | sed "s|^$DEST/|      |"
    FOUND=1
  fi
}
echo "🔍 公開前チェック: $DEST"
report "ローカルパス（${USERS_DIR}）" "$(count_files "$USERS_DIR")"
report "Google クライアントID" "$(count_files "$CLIENT_ID_RE")"
report "個人メールアドレス" "$(count_files '[A-Za-z0-9._%+-]+@(gmail|yahoo|icloud|outlook)\.(com|co\.jp)')"
report "Discord Webhook URL" "$(count_files 'discord(app)?\.com/api/webhooks/[0-9]')"
report "秘密情報らしいファイル名" "$(find "$DEST" \( -name .git -o -name node_modules \) -prune -o -type f \( -iname 'client_secret*' -o -iname 'credentials*.json' -o -iname '.env' -o -iname '.env.*' -o -iname '*.pem' \) -print)"
[ "$FOUND" -eq 0 ] || fail "公開前チェックで見つかった項目があります。上の一覧を確認してください"

# 7. 結果と次にやること
echo "✅ 書き出し完了: $(find "$DEST" \( -name .git -o -name node_modules \) -prune -o -type f -print | wc -l | tr -d ' ') ファイル"
cat <<EOF
次にやること:
  1. cd "$DEST" && npm ci --legacy-peer-deps && npm test
  2. Chrome で "$DEST" を「パッケージ化されていない拡張機能」として読み込み、popup が開くことを確認
  3. 公開するときは git init → GitHub に新しい公開リポジトリを作成 → push（このスクリプトは行わない）
EOF
