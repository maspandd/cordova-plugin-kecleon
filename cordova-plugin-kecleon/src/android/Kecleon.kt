package dev.kecleon

import android.app.Activity
import android.os.Build
import android.util.Log
import android.view.WindowManager
import androidx.annotation.RequiresApi
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaPlugin
import org.apache.cordova.PluginResult
import org.json.JSONArray
import org.json.JSONObject
import java.util.function.Consumer

/**
 * Prevents capture with FLAG_SECURE and reports screenshot (API 34+) and
 * screen-recording (API 35+) events to JS over a single kept callback.
 */
class Kecleon : CordovaPlugin() {

    private var enabled = false
    private var captured: Boolean? = null
    private var eventCallback: CallbackContext? = null

    // Typed as Any so devices below API 34/35 never resolve the callback types.
    private var screenshotCallback: Any? = null
    private var recordingCallback: Any? = null

    override fun pluginInitialize() {
        cordova.activity.runOnUiThread { registerCallbacks() }
    }

    override fun execute(action: String, args: JSONArray, callbackContext: CallbackContext): Boolean {
        when (action) {
            "enable" -> setSecure(true, callbackContext)
            "disable" -> setSecure(false, callbackContext)
            "isEnabled" -> callbackContext.success(JSONObject().put("enabled", enabled))
            "isCaptured" -> callbackContext.success(JSONObject().put("captured", captured ?: JSONObject.NULL))
            "getCapabilities" -> callbackContext.success(capabilities())
            "listen" -> listen(callbackContext)
            else -> return false
        }
        return true
    }

    // Lifecycle (called on the UI thread)

    override fun onStart() = registerCallbacks()

    override fun onStop() = unregisterCallbacks()

    override fun onResume(multitasking: Boolean) {
        // Re-assert in case the activity window was recreated.
        if (enabled) cordova.activity?.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }

    override fun onReset() {
        eventCallback = null
    }

    override fun onDestroy() = unregisterCallbacks()

    // Actions

    private fun setSecure(secure: Boolean, callbackContext: CallbackContext) {
        val activity = cordova.activity
        if (activity == null) {
            callbackContext.error(error("NO_ACTIVITY", "No foreground activity"))
            return
        }
        activity.runOnUiThread {
            try {
                if (secure) {
                    activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                } else {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                }
                enabled = secure
                callbackContext.success()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update FLAG_SECURE", e)
                callbackContext.error(error("NATIVE_ERROR", e.message ?: "Failed to update FLAG_SECURE"))
            }
        }
    }

    private fun listen(callbackContext: CallbackContext) {
        eventCallback = callbackContext
        callbackContext.sendPluginResult(PluginResult(PluginResult.Status.NO_RESULT).apply { keepCallback = true })
    }

    private fun capabilities(): JSONObject = JSONObject()
        .put("canDetectScreenshot", Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
        .put("canDetectRecording", Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM)

    // Detection callbacks

    private fun registerCallbacks() {
        val activity = cordova.activity ?: return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && screenshotCallback == null) {
                screenshotCallback = Api34.register(activity) { emit(JSONObject().put("type", "screenshot")) }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM && recordingCallback == null) {
                val (callback, initial) = Api35.register(activity) { updateCaptured(it) }
                recordingCallback = callback
                updateCaptured(initial)
            }
        } catch (e: SecurityException) {
            Log.w(TAG, "Detection permission missing; events disabled", e)
        }
    }

    private fun unregisterCallbacks() {
        val activity = cordova.activity ?: return
        try {
            screenshotCallback?.let {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) Api34.unregister(activity, it)
            }
            recordingCallback?.let {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) Api35.unregister(activity, it)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to unregister detection callbacks", e)
        } finally {
            screenshotCallback = null
            recordingCallback = null
        }
    }

    private fun updateCaptured(value: Boolean) {
        if (captured == value) return
        // The first reading only reports a change when capture is already on.
        val isChange = captured != null || value
        captured = value
        if (isChange) emit(JSONObject().put("type", "captureChange").put("captured", value))
    }

    private fun emit(event: JSONObject) {
        val callback = eventCallback ?: return
        callback.sendPluginResult(PluginResult(PluginResult.Status.OK, event).apply { keepCallback = true })
    }

    private fun error(code: String, message: String): JSONObject =
        JSONObject().put("code", code).put("message", message)

    @RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    private object Api34 {
        fun register(activity: Activity, onScreenshot: () -> Unit): Any {
            val callback = Activity.ScreenCaptureCallback { onScreenshot() }
            activity.registerScreenCaptureCallback(activity.mainExecutor, callback)
            return callback
        }

        fun unregister(activity: Activity, callback: Any) {
            activity.unregisterScreenCaptureCallback(callback as Activity.ScreenCaptureCallback)
        }
    }

    @RequiresApi(Build.VERSION_CODES.VANILLA_ICE_CREAM)
    private object Api35 {
        /** Returns the callback and whether the app is currently visible in a recording. */
        fun register(activity: Activity, onChange: (Boolean) -> Unit): Pair<Any, Boolean> {
            val callback = Consumer<Int> { state -> onChange(state == WindowManager.SCREEN_RECORDING_STATE_VISIBLE) }
            val initial = activity.windowManager.addScreenRecordingCallback(activity.mainExecutor, callback)
            return callback to (initial == WindowManager.SCREEN_RECORDING_STATE_VISIBLE)
        }

        @Suppress("UNCHECKED_CAST")
        fun unregister(activity: Activity, callback: Any) {
            activity.windowManager.removeScreenRecordingCallback(callback as Consumer<Int>)
        }
    }

    private companion object {
        const val TAG = "Kecleon"
    }
}
