import type { CapacitorConfig } from '@capacitor/cli'

// appId is a reverse-domain identifier Apple/Google use to uniquely track
// this app in their stores — placeholder for now (com.alfred.app), free to
// change until an actual App Store Connect / Play Console listing is
// created against it, but fixed forever after that.
const config: CapacitorConfig = {
  appId: 'com.alfred.app',
  appName: 'Alfred',
  webDir: 'dist',
  backgroundColor: '#5F07EF',
}

export default config
