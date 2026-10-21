import webpush from 'web-push';
import { env } from './env.js';

let vapidPublicKey = env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  // Generate a dev fallback keypair if not configured
  const generated = webpush.generateVAPIDKeys();
  vapidPublicKey = generated.publicKey;
  vapidPrivateKey = generated.privateKey;
  console.log('[WebPush] Notice: Generated ephemeral VAPID keys for local development.');
}

webpush.setVapidDetails(
  env.VAPID_SUBJECT,
  vapidPublicKey,
  vapidPrivateKey
);

export { webpush, vapidPublicKey };
