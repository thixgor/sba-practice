const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sba-practice.vercel.app";

export function getVerificationUrl(protocolId: string): string {
  return `${APP_URL}/verificar/${protocolId}`;
}

export function getQRCodeValue(protocolId: string): string {
  return getVerificationUrl(protocolId);
}
