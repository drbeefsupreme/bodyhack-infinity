package ai.bodyhack.infinity.pose

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.SystemClock
import android.util.Base64
import com.getcapacitor.JSObject
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/** IMAGE-mode landmarker for `detectImage`, on its own thread, built on first use and dropped by [release]. */
internal class StillDetector(private val context: Context, private val policy: DelegatePolicy) {
    private val executor: ExecutorService = Executors.newSingleThreadExecutor()
    private var landmarker: Pair<PoseLandmarker, Delegate>? = null

    /** Calls [done] on the detector thread with `{ frame, delegate }`, or with the failure. */
    fun detect(dataUrl: String, done: (Result<JSObject>) -> Unit) {
        executor.execute {
            done(
                runCatching {
                    val bitmap = decode(dataUrl)
                    val (result, delegate) = run(bitmap)
                    JSObject().apply {
                        put("frame", poseFrame(result, SystemClock.uptimeMillis(), bitmap.width, bitmap.height))
                        put("delegate", delegate.label)
                    }
                },
            )
        }
    }

    private fun run(bitmap: Bitmap) = BitmapImageBuilder(bitmap).build().let { image ->
        val (current, delegate) = landmarker ?: policy.create(context, RunningMode.IMAGE).also { landmarker = it }
        try {
            current.detect(image) to delegate
        } catch (e: RuntimeException) {
            if (delegate != Delegate.GPU) throw e
            policy.gpuFailed(e)
            current.closeSafely()
            val cpu = policy.create(context, RunningMode.IMAGE).also { landmarker = it }
            cpu.first.detect(image) to cpu.second
        }
    }

    private fun decode(dataUrl: String): Bitmap {
        val comma = dataUrl.indexOf(',')
        require(dataUrl.startsWith("data:image/") && comma > 0) { "dataUrl must be a PNG or JPEG data URL" }
        val bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT)
        val options = BitmapFactory.Options().apply { inPreferredConfig = Bitmap.Config.ARGB_8888 }
        return requireNotNull(BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)) { "the image cannot be decoded" }
    }

    /** Frees the landmarker; the next [detect] builds a new one. */
    fun release() = executor.execute {
        landmarker?.first?.closeSafely()
        landmarker = null
    }

    fun shutdown() {
        release()
        executor.shutdown()
    }
}
