use image::{DynamicImage, ImageFormat};
use serde::Serialize;
use std::io::Cursor;
use xcap::Window;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CaptureWindowInfo {
    id: u32,
    app_name: String,
    title: String,
    width: u32,
    height: u32,
    x: i32,
    y: i32,
    is_focused: bool,
    is_minimized: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CapturedWindowImage {
    window: CaptureWindowInfo,
    png_bytes: Vec<u8>,
}

pub(crate) fn capture_window_dimensions_are_usable(
    is_minimized: bool,
    width: u32,
    height: u32,
) -> bool {
    (cfg!(target_os = "windows") && is_minimized) || (width >= 80 && height >= 80)
}

fn window_info(window: &Window) -> Option<CaptureWindowInfo> {
    let is_minimized = window.is_minimized().unwrap_or(true);
    if !cfg!(target_os = "windows") && is_minimized {
        return None;
    }

    let app_name = window.app_name().unwrap_or_default();
    let title = window.title().unwrap_or_default();
    let width = window.width().unwrap_or(0);
    let height = window.height().unwrap_or(0);

    if !capture_window_dimensions_are_usable(is_minimized, width, height) {
        return None;
    }

    if app_name.trim().is_empty() && title.trim().is_empty() {
        return None;
    }

    Some(CaptureWindowInfo {
        id: window.id().ok()?,
        app_name,
        title,
        width,
        height,
        x: window.x().unwrap_or_default(),
        y: window.y().unwrap_or_default(),
        is_focused: window.is_focused().unwrap_or(false),
        is_minimized,
    })
}

#[cfg(target_os = "windows")]
mod native_window {
    use std::{ffi::c_void, thread, time::Duration};

    const SW_MINIMIZE: i32 = 6;
    const SW_RESTORE: i32 = 9;

    #[link(name = "user32")]
    unsafe extern "system" {
        fn GetForegroundWindow() -> *mut c_void;
        fn SetForegroundWindow(window: *mut c_void) -> i32;
        fn ShowWindow(window: *mut c_void, command: i32) -> i32;
    }

    pub struct RestoredWindow {
        window: *mut c_void,
        previous_focus: *mut c_void,
    }

    impl RestoredWindow {
        pub fn new(window_id: u32, was_minimized: bool) -> Option<Self> {
            if !was_minimized {
                return None;
            }

            let window = window_id as usize as *mut c_void;
            let previous_focus = unsafe { GetForegroundWindow() };
            unsafe {
                ShowWindow(window, SW_RESTORE);
                SetForegroundWindow(window);
            }
            thread::sleep(Duration::from_millis(450));
            Some(Self {
                window,
                previous_focus,
            })
        }
    }

    impl Drop for RestoredWindow {
        fn drop(&mut self) {
            unsafe {
                ShowWindow(self.window, SW_MINIMIZE);
                if !self.previous_focus.is_null() {
                    SetForegroundWindow(self.previous_focus);
                }
            }
        }
    }
}

fn capture_windows() -> Result<Vec<(Window, CaptureWindowInfo)>, String> {
    let windows = Window::all().map_err(|error| format!("WINDOW_LIST_FAILED: {error}"))?;
    Ok(windows
        .into_iter()
        .filter_map(|window| window_info(&window).map(|info| (window, info)))
        .collect())
}

fn is_tradingview_window(info: &CaptureWindowInfo) -> bool {
    let text = format!("{} {}", info.app_name, info.title).to_lowercase();
    text.contains("tradingview")
}

fn capture_window_image(
    window: &Window,
    info: CaptureWindowInfo,
) -> Result<CapturedWindowImage, String> {
    #[cfg(target_os = "windows")]
    let _restored_window = native_window::RestoredWindow::new(info.id, info.is_minimized);

    #[cfg(not(target_os = "windows"))]
    if info.is_minimized {
        return Err("WINDOW_MINIMIZED".to_string());
    }

    let info = window_info(window).unwrap_or(info);
    let image = window
        .capture_image()
        .map_err(|error| format!("WINDOW_CAPTURE_FAILED: {error}"))?;
    let mut cursor = Cursor::new(Vec::new());
    DynamicImage::ImageRgba8(image)
        .write_to(&mut cursor, ImageFormat::Png)
        .map_err(|error| format!("PNG_ENCODE_FAILED: {error}"))?;

    Ok(CapturedWindowImage {
        window: info,
        png_bytes: cursor.into_inner(),
    })
}

#[tauri::command]
pub(crate) fn list_capture_windows() -> Result<Vec<CaptureWindowInfo>, String> {
    Ok(capture_windows()?
        .into_iter()
        .map(|(_, info)| info)
        .collect())
}

#[tauri::command]
pub(crate) fn capture_tradingview_window() -> Result<CapturedWindowImage, String> {
    let windows = capture_windows()?;
    let (window, info) = windows
        .into_iter()
        .find(|(_, info)| is_tradingview_window(info))
        .ok_or_else(|| "TRADINGVIEW_NOT_FOUND".to_string())?;
    capture_window_image(&window, info)
}

#[tauri::command]
pub(crate) fn capture_window_by_id(window_id: u32) -> Result<CapturedWindowImage, String> {
    let windows = capture_windows()?;
    let (window, info) = windows
        .into_iter()
        .find(|(window, _)| window.id().ok() == Some(window_id))
        .ok_or_else(|| "WINDOW_NOT_FOUND".to_string())?;
    capture_window_image(&window, info)
}
