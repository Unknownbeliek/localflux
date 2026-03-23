const os = require('os');

/**
 * Detects if the current machine is likely hosting via a mobile hotspot
 * (e.g., iOS 172.20.10.x, Android 192.168.43.x / 192.168.49.x)
 */
function isHotspotNetwork() {
  const interfaces = os.networkInterfaces();
  
  for (const iface of Object.values(interfaces)) {
    if (!Array.isArray(iface)) continue;
    
    for (const addr of iface) {
      if (!addr || addr.internal || addr.family !== 'IPv4') continue;
      
      const ip = addr.address;
      // iOS Hotspot
      if (ip.startsWith('172.20.10.')) return true;
      // Android Hotspot common subnets
      if (ip.startsWith('192.168.43.') || ip.startsWith('192.168.49.')) return true;
    }
  }
  
  return false;
}

module.exports = { isHotspotNetwork };
