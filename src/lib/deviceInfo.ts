// lib/deviceInfo.ts

export interface DeviceInfo {
  deviceId: string;
  deviceType: string;
  deviceName: string;
}

export const getWebDeviceInfo = (): DeviceInfo => {
  // Get or generate device ID (persist in localStorage)
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('deviceId', deviceId);
  }

  // Detect browser and OS
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown Browser';
  let osName = 'Unknown OS';

  // Detect browser
  if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
    browserName = 'Chrome';
  } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    browserName = 'Safari';
  } else if (userAgent.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
  } else if (userAgent.indexOf('Edg') > -1) {
    browserName = 'Edge';
  }

  // Detect OS
  if (userAgent.indexOf('Win') > -1) osName = 'Windows';
  else if (userAgent.indexOf('Mac') > -1) osName = 'MacOS';
  else if (userAgent.indexOf('Linux') > -1) osName = 'Linux';
  else if (userAgent.indexOf('Android') > -1) osName = 'Android';
  else if (userAgent.indexOf('iOS') > -1) osName = 'iOS';

  return {
    deviceId,
    deviceType: 'web',
    deviceName: `${browserName} on ${osName}`,
  };
};
