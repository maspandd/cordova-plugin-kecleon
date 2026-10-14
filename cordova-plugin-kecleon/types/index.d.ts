export interface KecleonCapabilities {
    /** Android 14 (API 34) and later. */
    canDetectScreenshot: boolean;
    /** Android 15 (API 35) and later. */
    canDetectRecording: boolean;
}

export interface KecleonScreenshotEvent {
    type: 'screenshot';
}

export interface KecleonCaptureChangeEvent {
    type: 'captureChange';
    /** The app is visible in an active screen recording. */
    captured: boolean;
}

export interface KecleonEventMap {
    screenshot: KecleonScreenshotEvent;
    captureChange: KecleonCaptureChangeEvent;
}

/** Rejections carry a stable `code`: NO_ACTIVITY, NATIVE_ERROR or UNKNOWN. */
export interface KecleonError extends Error {
    code: string;
}

export interface KecleonPlugin {
    /** Block screenshots, recordings and the recent-apps thumbnail (FLAG_SECURE). */
    enable(): Promise<void>;
    disable(): Promise<void>;
    isEnabled(): Promise<boolean>;
    /** null below Android 15, where this can't be detected. */
    isCaptured(): Promise<boolean | null>;
    getCapabilities(): Promise<KecleonCapabilities>;
    on<K extends keyof KecleonEventMap>(event: K, callback: (event: KecleonEventMap[K]) => void): () => void;
    off<K extends keyof KecleonEventMap>(event: K, callback: (event: KecleonEventMap[K]) => void): void;
}

declare global {
    const Kecleon: KecleonPlugin;
    interface Window {
        Kecleon: KecleonPlugin;
    }
}
