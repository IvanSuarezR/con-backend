package com.example.movil

import android.content.ContentValues
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.util.Base64
import androidx.annotation.NonNull
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.IOException

class MainActivity : FlutterActivity() {
	private val CHANNEL = "com.example.movil/media"

	override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
		super.configureFlutterEngine(flutterEngine)
		MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call: MethodCall, result: MethodChannel.Result ->
			when (call.method) {
				"saveImageBytes" -> {
					val b64 = call.argument<String>("base64")
					val name = call.argument<String>("name") ?: "qr_${'$'}{System.currentTimeMillis()}.png"
					if (b64.isNullOrEmpty()) {
						result.error("ARG", "Missing base64", null)
						return@setMethodCallHandler
					}
					try {
						val bytes = Base64.decode(b64, Base64.DEFAULT)
						val ok = savePngToMediaStore(bytes, name)
						if (ok) result.success(true) else result.error("IO", "Failed to save", null)
					} catch (e: Exception) {
						result.error("EX", e.message, null)
					}
				}
				else -> result.notImplemented()
			}
		}
	}

	private fun savePngToMediaStore(bytes: ByteArray, name: String): Boolean {
		val resolver = applicationContext.contentResolver
		val contentValues = ContentValues().apply {
			put(MediaStore.Images.Media.DISPLAY_NAME, name)
			put(MediaStore.Images.Media.MIME_TYPE, "image/png")
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
				put(MediaStore.Images.Media.IS_PENDING, 1)
				put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Autorizaciones")
			}
		}
		val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues) ?: return false
		return try {
			resolver.openOutputStream(uri).use { out ->
				if (out == null) return false
				out.write(bytes)
				out.flush()
			}
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
				val cv = ContentValues().apply { put(MediaStore.Images.Media.IS_PENDING, 0) }
				resolver.update(uri, cv, null, null)
			}
			true
		} catch (e: IOException) {
			false
		}
	}
}
