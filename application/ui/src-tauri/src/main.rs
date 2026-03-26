// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    env,
    process::{Child, Command},
    sync::{Arc, Mutex},
};

#[cfg(debug_assertions)]
use std::{
    io::{BufRead, BufReader},
    process::Stdio,
    thread,
};

use tauri::RunEvent;

/// "geti-backend.exe" on Windows, "geti-backend" elsewhere.
fn backend_filename() -> &'static str {
    if cfg!(windows) {
        "geti-backend.exe"
    } else {
        "geti-backend"
    }
}

#[cfg(debug_assertions)]
fn forward_backend_stream<R>(reader: R, stream_name: &'static str)
where
    R: std::io::Read + Send + 'static,
{
    thread::spawn(move || {
        let reader = BufReader::new(reader);

        for line in reader.lines().map_while(Result::ok) {
            eprintln!("[backend {stream_name}] {line}");
        }
    });
}

/// Spawns the side-car in the same folder as this executable.
fn spawn_backend() -> std::io::Result<Child> {
    // Locate the Tauri executable, then its parent folder.
    let exe_path = env::current_exe().expect("failed to get current exe path");
    let exe_dir = exe_path
        .parent()
        .expect("failed to get parent directory of exe");

    // Tauri build renames the platform-suffixed sidecar to the plain filename.
    let backend_path = exe_dir.join(backend_filename());

    #[cfg(debug_assertions)]
    eprintln!("[tauri] Looking for backend side-car at {:?}", backend_path);

    let mut command = Command::new(&backend_path);
    command.env("CORS_ORIGINS", "http://tauri.localhost");
    command.env("PYTHONUNBUFFERED", "1");

    #[cfg(debug_assertions)]
    {
        command.stdout(Stdio::piped()).stderr(Stdio::piped());
    }

    #[cfg(all(windows, not(debug_assertions)))]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let mut child = command.spawn()?;

    #[cfg(debug_assertions)]
    {
        eprintln!("[tauri] Spawned backend: {:?}", backend_path);

        if let Some(stdout) = child.stdout.take() {
            forward_backend_stream(stdout, "stdout");
        }

        if let Some(stderr) = child.stderr.take() {
            forward_backend_stream(stderr, "stderr");
        }
    }

    Ok(child)
}

fn main() {
    // Shared handle so we can kill it on exit.
    let child_handle = Arc::new(Mutex::new(None));

    let app = tauri::Builder::default()
        .setup({
            let child_handle = child_handle.clone();

            move |_app_handle| {
                let child = spawn_backend().expect("Failed to spawn python backend");
                *child_handle.lock().unwrap() = Some(child);
                Ok(())
            }
        })
        .invoke_handler(tauri::generate_handler![])
        .build(tauri::generate_context!())
        .expect("error building Tauri");

    let exit_handle = child_handle.clone();
    app.run(move |_app_handle, event| {
        if let RunEvent::Exit = event {
            if let Some(mut child) = exit_handle.lock().unwrap().take() {
                let _ = child.kill();

                #[cfg(debug_assertions)]
                eprintln!("[tauri] Backend terminated");
            }
        }
    });
}
