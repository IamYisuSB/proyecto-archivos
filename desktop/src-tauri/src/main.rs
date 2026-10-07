// Sin ventana de consola detrás de la app en la versión final
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    pixelote_lib::run()
}
