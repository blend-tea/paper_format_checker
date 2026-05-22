#!/usr/bin/env bash
set -euo pipefail

EXE="src-tauri/target/x86_64-pc-windows-msvc/release/paper_format_checker.exe"
OUT="src-tauri/target/x86_64-pc-windows-msvc/release/paper_format_checker2.exe"

if [ -e "$OUT" ]; then
  rm "$OUT"
fi

upx "$EXE" -o "$OUT"
sed -i 's/UPX0/\x00\x00\x00\x00/g' "$OUT"
sed -i 's/UPX1/\x00\x00\x00\x00/g' "$OUT"
sed -i 's/UPX!/\x00\x00\x00\x00/g' "$OUT"
