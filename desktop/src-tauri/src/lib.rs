/// Pixelote de escritorio: una ventana con la app web dentro (WebView2 en Windows).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("no se pudo iniciar Pixelote");
}
