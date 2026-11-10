import ExpoModulesCore
import UIKit

// Kiosk mode on iPhone/iPad. iOS has no Device Owner or Lock Task: the device is locked into one
// app with Apple's Guided Access. Staff start it with a triple-click on the side (or Home) button,
// or, on a supervised iPad whose MDM/Apple Configurator profile allows Autonomous Single App Mode
// for this app, the app can start and stop it itself. The JS side (src/lib/kiosk.tsx) uses the
// same calls as on Android.
public final class KioskModule: Module {
  private var guidedAccessOn = false
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("Kiosk")

    OnCreate {
      DispatchQueue.main.async {
        self.refresh()
        self.observer = NotificationCenter.default.addObserver(
          forName: UIAccessibility.guidedAccessStatusDidChangeNotification,
          object: nil,
          queue: .main
        ) { [weak self] _ in
          self?.refresh()
        }
      }
    }

    OnDestroy {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
      }
    }

    // There is no Device Owner on iOS.
    Function("isDeviceOwner") { () -> Bool in
      return false
    }

    Function("isLockTaskActive") { () -> Bool in
      return self.guidedAccessOn
    }

    // Asks iOS to start Guided Access. Only works on a supervised iPad that allows it for this app;
    // everywhere else staff start Guided Access with a triple-click. Never a "hard" lock from the
    // app's side, so this returns false like Android does without Device Owner.
    Function("enable") { () -> Bool in
      DispatchQueue.main.async {
        UIAccessibility.requestGuidedAccessSession(enabled: true) { _ in
          DispatchQueue.main.async {
            self.refresh()
          }
        }
      }
      return false
    }

    // Ends a Guided Access session the app started itself. One started with a triple-click can only
    // be ended with a triple-click and its passcode.
    Function("disable") { () -> Void in
      DispatchQueue.main.async {
        UIAccessibility.requestGuidedAccessSession(enabled: false) { _ in
          DispatchQueue.main.async {
            self.refresh()
          }
        }
      }
    }

    // iOS cannot open an app by itself after a restart; Single App Mode from Apple Configurator or
    // an MDM does that instead.
    Function("setAutoStart") { (_: Bool) -> Bool in
      return false
    }

    Function("removeDeviceOwner") { () -> Bool in
      return false
    }
  }

  // Called on the main thread. Keeps the screen on while the device is locked into the app, like
  // the Android kiosk does.
  private func refresh() {
    guidedAccessOn = UIAccessibility.isGuidedAccessEnabled
    UIApplication.shared.isIdleTimerDisabled = guidedAccessOn
  }
}
