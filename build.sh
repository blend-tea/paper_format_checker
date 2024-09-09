if [ -e src-tauri/target/x86_64-pc-windows-msvc/release/paper_format_checker2.exe ]; then
    rm src-tauri/target/x86_64-pc-windows-msvc/release/paper_format_checker2.exe
fi
upx src-tauri/target/x86_64-pc-windows-msvc/release/paper_format_checker.exe -o src-tauri/target/x86_64-pc-windows-msvc/release/paper_format_checker2.exe
sed -i 's/UPX0/\x00\x00\x00\x00/g' src-tauri/target/x86_64-pc-windows-msvc/release/paper_format_checker2.exe
sed -i 's/UPX1/\x00\x00\x00\x00/g' src-tauri/target/x86_64-pc-windows-msvc/release/paper_format_checker2.exe
sed -i 's/UPX!/\x00\x00\x00\x00/g' src-tauri/target/x86_64-pc-windows-msvc/release/paper_format_checker2.exe