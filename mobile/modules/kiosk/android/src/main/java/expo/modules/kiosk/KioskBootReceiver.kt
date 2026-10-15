package expo.modules.kiosk

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Backup only: Android 10+ blocks most background activity starts, so the HOME activity registered
// as the persistent preferred home is the primary boot path. Only acts when auto-start is enabled.
class KioskBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val prefs = context.getSharedPreferences(KioskModule.PREFS, Context.MODE_PRIVATE)
    if (!prefs.getBoolean(KioskModule.PREF_AUTO_START, false)) return
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      context.startActivity(launch)
    } catch (_: Exception) {
      // Background start was blocked; the HOME activity path covers this case.
    }
  }
}
