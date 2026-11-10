Pod::Spec.new do |s|
  s.name           = 'Kiosk'
  s.version        = '1.0.0'
  s.summary        = 'Kiosk mode for the Pak & Send app'
  s.description    = 'Kiosk mode for the Pak & Send app: Guided Access on iOS.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
