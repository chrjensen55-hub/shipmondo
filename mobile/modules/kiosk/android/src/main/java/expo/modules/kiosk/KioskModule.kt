package expo.modules.kiosk

import android.app.Activity
import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.UserManager
import android.provider.Settings
import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class KioskModule : Module() {
  companion object {
    const val PREFS = "pak_send_kiosk"
    const val PREF_AUTO_START = "auto_start"

    private val RESTRICTIONS = listOf(
      UserManager.DISALLOW_SAFE_BOOT,
      UserManager.DISALLOW_FACTORY_RESET,
      UserManager.DISALLOW_ADD_USER,
      UserManager.DISALLOW_MOUNT_PHYSICAL_MEDIA,
      UserManager.DISALLOW_USB_FILE_TRANSFER,
    )
  }

  private var locked = false

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is not available")

  private val policyManager: DevicePolicyManager
    get() = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

  private val admin: ComponentName
    get() = ComponentName(context, KioskAdminReceiver::class.java)

  private fun isOwner(): Boolean = policyManager.isDeviceOwnerApp(context.packageName)

  override fun definition() = ModuleDefinition {
    Name("Kiosk")

    Function("isDeviceOwner") {
      return@Function isOwner()
    }

    Function("isLockTaskActive") {
      val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      return@Function manager.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
    }

    // Returns true when the hard lock (device owner) is applied, false when only normal screen
    // pinning could be used.
    Function("enable") {
      val activity = appContext.currentActivity ?: return@Function false
      val owner = isOwner()
      if (owner) applyPolicies(true)
      locked = true
      activity.runOnUiThread {
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setImmersive(activity, true)
        try {
          activity.startLockTask()
        } catch (_: Exception) {
        }
      }
      return@Function owner
    }

    Function("disable") {
      locked = false
      val activity = appContext.currentActivity
      activity?.runOnUiThread {
        try {
          activity.stopLockTask()
        } catch (_: Exception) {
        }
        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setImmersive(activity, false)
      }
      if (isOwner()) applyPolicies(false)
    }

    Function("setAutoStart") { enabled: Boolean ->
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(PREF_AUTO_START, enabled).apply()
      if (!isOwner()) return@Function false
      return@Function try {
        val manager = policyManager
        if (enabled) {
          val filter = IntentFilter(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            addCategory(Intent.CATEGORY_DEFAULT)
          }
          manager.addPersistentPreferredActivity(admin, filter, ComponentName(context, KioskHomeActivity::class.java))
        } else {
          manager.clearPackagePersistentPreferredActivities(admin, context.packageName)
        }
        true
      } catch (_: Exception) {
        false
      }
    }

    Function("removeDeviceOwner") {
      if (!isOwner()) return@Function false
      return@Function try {
        applyPolicies(false)
        policyManager.clearPackagePersistentPreferredActivities(admin, context.packageName)
        policyManager.clearDeviceOwnerApp(context.packageName)
        true
      } catch (_: Exception) {
        false
      }
    }

    OnActivityEntersForeground {
      val activity = appContext.currentActivity
      if (locked && activity != null) {
        activity.runOnUiThread { setImmersive(activity, true) }
      }
    }
  }

  // Each policy is applied on its own so one unsupported call on a given device can't stop the rest.
  private fun applyPolicies(enable: Boolean) {
    val manager = policyManager
    val component = admin
    val pkg = context.packageName

    runCatching { manager.setLockTaskPackages(component, if (enable) arrayOf(pkg) else emptyArray()) }
    if (enable && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      runCatching { manager.setLockTaskFeatures(component, DevicePolicyManager.LOCK_TASK_FEATURE_NONE) }
    }
    runCatching { manager.setStatusBarDisabled(component, enable) }
    runCatching { manager.setKeyguardDisabled(component, enable) }
    for (restriction in RESTRICTIONS) {
      runCatching {
        if (enable) manager.addUserRestriction(component, restriction) else manager.clearUserRestriction(component, restriction)
      }
    }
    runCatching {
      val plugged = BatteryManager.BATTERY_PLUGGED_AC or BatteryManager.BATTERY_PLUGGED_USB or BatteryManager.BATTERY_PLUGGED_WIRELESS
      manager.setGlobalSetting(component, Settings.Global.STAY_ON_WHILE_PLUGGED_IN, if (enable) plugged.toString() else "0")
    }
  }

  private fun setImmersive(activity: Activity, on: Boolean) {
    val window = activity.window
    val controller = WindowCompat.getInsetsController(window, window.decorView)
    if (on) {
      controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      controller.hide(WindowInsetsCompat.Type.systemBars())
    } else {
      controller.show(WindowInsetsCompat.Type.systemBars())
    }
  }
}
