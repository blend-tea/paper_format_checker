// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

#[tauri::command]
fn save_file(contents: String) -> String {
    let file_path = tauri::api::dialog::blocking::FileDialogBuilder::new().save_file();
    if let Some(path) = file_path.as_ref() {
        if let Ok(_) = std::fs::write(path, contents) {
            format!("File saved: {}", path.to_string_lossy())
        } else {
            "Failed to save file".to_string()
        }
    } else {
        "No file selected".to_string()
    }
}

#[tauri::command]
fn open_rules() -> String {
    if let Ok(file_contents) = std::fs::read_to_string("rules.json") {
        file_contents
    } else {
        "error".to_string()
    }
}

fn main() {
    let file_open = tauri::CustomMenuItem::new("fileOpen", "File Open...");
    let file_save = tauri::CustomMenuItem::new("fileSave", "File Save...");
    let file_menu = tauri::Submenu::new(
        "File",
        tauri::Menu::new().add_item(file_open).add_item(file_save),
    );
    let menu = tauri::Menu::new().add_submenu(file_menu);
    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| match event.menu_item_id() {
            "fileOpen" => {
                // event.window().emit("fileOpen", {}).unwrap();
                let file_path = tauri::api::dialog::blocking::FileDialogBuilder::new().pick_file();
                if file_path.is_some() {
                    if let Some(path) = file_path.as_ref() {
                        if let Ok(file_contents) = std::fs::read_to_string(path) {
                            event
                                .window()
                                .emit("fileOpen", file_contents.clone())
                                .unwrap();
                        }
                    } else {
                        event
                            .window()
                            .emit("fileOpen", "error".to_string())
                            .unwrap();
                    }
                } else {
                    event
                        .window()
                        .emit("fileOpen", "error".to_string())
                        .unwrap();
                }
            }
            "fileSave" => {
                event.window().emit("fileSave", {}).unwrap();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![save_file, open_rules])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
