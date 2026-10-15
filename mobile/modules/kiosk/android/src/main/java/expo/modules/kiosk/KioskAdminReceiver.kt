package expo.modules.kiosk

import android.app.admin.DeviceAdminReceiver

// Marker receiver the tablet is provisioned against:
//   adb shell dpm set-device-owner dk.pakogsend.app/expo.modules.kiosk.KioskAdminReceiver
class KioskAdminReceiver : DeviceAdminReceiver()
