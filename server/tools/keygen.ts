/**
 * CLI phát hành khóa bản quyền (dùng bởi NHÀ CUNG CẤP).
 * Cách dùng:
 *   npm run keygen -- --edition PRO --licensee "Phòng khám MeHeal" --days 365
 *   npm run keygen -- -e STANDARD -l "Khách hàng A"            (vĩnh viễn)
 *   npm run keygen -- -e TRIAL -l "Dùng thử" -d 15
 */
import {generateLicense, verifyLicense, type Edition} from '../license.ts';

function arg(names: string[], def?: string): string | undefined {
  const argv = process.argv.slice(2);
  for (const n of names) {
    const i = argv.indexOf(n);
    if (i >= 0 && argv[i + 1]) return argv[i + 1];
  }
  return def;
}

const edition = (arg(['--edition', '-e'], 'STANDARD') || 'STANDARD').toUpperCase() as Edition;
const licensee = arg(['--licensee', '-l'], 'MeHeal Customer')!;
const days = Number(arg(['--days', '-d'], '0'));

const valid: Edition[] = ['TRIAL', 'STANDARD', 'PRO', 'ENTERPRISE'];
if (!valid.includes(edition)) {
  console.error(`Edition không hợp lệ: ${edition}. Chọn 1 trong: ${valid.join(', ')}`);
  process.exit(1);
}

const key = generateLicense({edition, licensee, days});
const check = verifyLicense(key);

console.log('\n============================================================');
console.log('   MeHeal - KHÓA BẢN QUYỀN MỚI ĐÃ PHÁT HÀNH');
console.log('============================================================');
console.log(`  Phiên bản   : ${edition}`);
console.log(`  Cấp cho     : ${licensee}`);
console.log(`  Hết hạn     : ${check.expiresAt ? new Date(check.expiresAt).toLocaleString('vi-VN') : 'Vĩnh viễn'}`);
console.log('------------------------------------------------------------');
console.log(`  KEY:\n  ${key}`);
console.log('============================================================');
console.log('  Gửi key này cho khách hàng để kích hoạt trong trang Admin.\n');
