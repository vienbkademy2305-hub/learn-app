// In cặp khóa VAPID cho Web Push (docs/PUSH_REMINDER_PLAN.md). Chỉ in ra màn hình, không ghi file.
//   node scripts/push-keys.mjs
import { createECDH, randomBytes } from "node:crypto";

const b64url = (b) => Buffer.from(b).toString("base64url");
const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${b64url(ecdh.getPublicKey())}   # vào .env.local (khóa công khai, nhúng vào web)`);
console.log(`VAPID_PUBLIC_KEY=${b64url(ecdh.getPublicKey())}`);
console.log(`VAPID_PRIVATE_KEY=${b64url(ecdh.getPrivateKey())}   # BÍ MẬT: chỉ đặt vào Supabase secrets`);
console.log(`PUSH_CRON_SECRET=${randomBytes(24).toString("hex")}   # BÍ MẬT: Supabase secrets + lệnh cron.schedule`);
