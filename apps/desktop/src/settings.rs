use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

const SETTINGS_FILE: &str = "desktop-settings";
const SETTINGS_HEADER: &str = "silent-pix-settings-v1";
const SERVER_URL_PREFIX: &str = "http://127.0.0.1:";

#[tauri::command]
pub fn read_server_url(app: AppHandle) -> Result<Option<String>, String> {
    let path = settings_path(&app)?;
    match fs::read_to_string(&path) {
        Ok(contents) => parse_settings(&contents).map(Some),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("Could not read Desktop settings: {error}")),
    }
}

#[tauri::command]
pub fn write_server_url(app: AppHandle, server_url: String) -> Result<(), String> {
    validate_server_url(&server_url)?;

    let path = settings_path(&app)?;
    let parent = path
        .parent()
        .ok_or_else(|| "Desktop settings path has no parent directory.".to_owned())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Could not create Desktop settings directory: {error}"))?;

    let contents = format!("{SETTINGS_HEADER}\n{server_url}\n");
    write_atomically(&path, contents.as_bytes())
        .map_err(|error| format!("Could not save Desktop settings: {error}"))
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|directory| directory.join(SETTINGS_FILE))
        .map_err(|error| format!("Could not locate Desktop settings directory: {error}"))
}

fn parse_settings(contents: &str) -> Result<String, String> {
    let mut lines = contents.lines();
    let version = lines.next();
    let server_url = lines.next();

    if version != Some(SETTINGS_HEADER) {
        return Err("Desktop settings use an unsupported version.".to_owned());
    }

    let server_url = server_url.ok_or_else(|| "Desktop settings are incomplete.".to_owned())?;
    if lines.next().is_some() {
        return Err("Desktop settings contain unexpected data.".to_owned());
    }

    validate_server_url(server_url)?;
    Ok(server_url.to_owned())
}

fn validate_server_url(server_url: &str) -> Result<(), String> {
    let port = server_url
        .strip_prefix(SERVER_URL_PREFIX)
        .ok_or_else(|| "Use a local Server URL such as http://127.0.0.1:3070.".to_owned())?;
    let parsed_port = port
        .parse::<u16>()
        .map_err(|_| "Server URL must include a port from 1 to 65535.".to_owned())?;

    if parsed_port == 0 || parsed_port == 80 || parsed_port.to_string() != port {
        return Err("Server URL must use a canonical, non-default port from 1 to 65535.".to_owned());
    }

    Ok(())
}

// NOTE: `fs::rename` replaces an existing destination on both Unix and Windows, so the
// settings file always holds either the previous or the new contents.
fn write_atomically(path: &Path, contents: &[u8]) -> io::Result<()> {
    let temporary_path = path.with_extension(format!("{}.tmp", std::process::id()));

    fs::write(&temporary_path, contents)?;

    if let Err(error) = fs::rename(&temporary_path, path) {
        let _ = fs::remove_file(&temporary_path);
        return Err(error);
    }

    Ok(())
}
