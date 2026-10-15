package expo.modules.kiosk

import android.app.Activity
import android.content.Intent
import android.os.Bundle

// Registered as a HOME activity so that, once the app is device owner and auto-start is on, Android
// opens the app after boot (and after a crash) instead of the normal launcher. It immediately hands
// over to the app's real launch activity.
class KioskHomeActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    if (launch != null) {
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      startActivity(launch)
    }
    finish()
  }
}
