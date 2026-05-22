use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::{AppHandle, Emitter, Manager, Runtime};

#[derive(Debug, Deserialize, Serialize)]
struct Rule {
    regex: String,
    error: String,
}

/// ビルド時に同梱する rules.toml。ディスク上に見つからないときのフォールバック。
const EMBEDDED_RULES: &str = include_str!("../../rules.toml");

/// rules.toml を探す。exe と同じ場所 → リソースディレクトリ → カレントディレクトリの順。
fn find_rules_path(app: &AppHandle) -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("rules.toml"));
        }
    }
    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("rules.toml"));
    }
    candidates.push(PathBuf::from("rules.toml"));

    candidates.into_iter().find(|path| path.exists())
}

/// TOML 形式のルールを、フロントエンドが扱う JSON 文字列へ変換する。
fn rules_to_json(toml_str: &str) -> Option<String> {
    let rules: HashMap<String, Rule> = toml::from_str(toml_str).ok()?;
    serde_json::to_string(&rules).ok()
}

#[tauri::command]
fn open_rules(app: AppHandle) -> String {
    let content = find_rules_path(&app)
        .and_then(|path| fs::read_to_string(path).ok())
        .unwrap_or_else(|| EMBEDDED_RULES.to_string());

    rules_to_json(&content).unwrap_or_else(|| "error".to_string())
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<String, String> {
    fs::write(&path, contents)
        .map(|_| format!("File saved: {path}"))
        .map_err(|e| e.to_string())
}

/// File メニュー（File Open... / File Save...）を組み立てる。
fn build_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let file_open =
        MenuItem::with_id(app, "fileOpen", "File Open...", true, Some("CmdOrCtrl+O"))?;
    let file_save =
        MenuItem::with_id(app, "fileSave", "File Save...", true, Some("CmdOrCtrl+S"))?;
    let file_menu = Submenu::with_items(app, "File", true, &[&file_open, &file_save])?;
    Menu::with_items(app, &[&file_menu])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let menu = build_menu(app.handle())?;
            app.set_menu(menu)?;

            app.on_menu_event(|app, event| {
                let Some(window) = app.get_webview_window("main") else {
                    return;
                };
                let _ = match event.id().as_ref() {
                    "fileOpen" => window.emit("fileOpenRequest", ()),
                    "fileSave" => window.emit("fileSaveRequest", ()),
                    _ => Ok(()),
                };
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![open_rules, read_file, write_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
