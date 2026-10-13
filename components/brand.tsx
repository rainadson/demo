import Link from 'next/link';
import Image from 'next/image';
import { company } from '@/lib/config';
export function Brand() {
  return <Link href="/" className="brand" aria-label={company.name + ' — início'}>
    <Image className="brand-logo-full" src="/brand/alicerce-logo.png" width={800} height={516} sizes="(max-width: 600px) 110px, 135px" alt="" style={{ width: 125, height: 'auto' }} />
    <Image className="brand-logo-mark" src="/brand/alicerce-mark.png" width={400} height={258} sizes="40px" alt="" style={{ display: 'none', width: 38, height: 'auto' }} />
  </Link>;
}
