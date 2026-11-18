import Image from 'next/image'

export const CARRIER_LOGOS: Record<string, string> = { DAO: '/logo/Dao.png', Bring: '/logo/bring.png', PostNord: '/logo/Postnord.jpg', GLS: '/logo/GLS.png' }
const carrierClass = (name: string) => `carrier carrier-${name.toLowerCase().replaceAll(' ', '-')}`

// unoptimized: the logos are small files, and the image optimizer can't fetch them through the
// staff login that guards every path, so the browser loads them directly.
export function CarrierLogo({ name }: { name: string }) {
 const src = CARRIER_LOGOS[name]
 if (!src) return <span className={carrierClass(name)}>{name}</span>
 return <span className={`${carrierClass(name)} carrier-logo`}><Image src={src} alt={name} fill sizes="82px" style={{ objectFit: 'contain' }} unoptimized/></span>
}
