mod settings;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            settings::read_server_url,
            settings::write_server_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Silent Pix");
}
