import Image from 'next/image'

export const CARRIER_LOGOS: Record<string, string> = { DAO: '/logo/Dao.png', Bring: '/logo/bring.png', PostNord: '/logo/Postnord.jpg', GLS: '/logo/GLS.png' }
const carrierClass = (name: string) => `carrier carrier-${name.toLowerCase().replaceAll(' ', '-')}`

export function CarrierLogo({ name }: { name: string }) {
 const src = CARRIER_LOGOS[name]
 if (!src) return <span className={carrierClass(name)}>{name}</span>
 return <span className={`${carrierClass(name)} carrier-logo`}><Image src={src} alt={name} fill sizes="82px" style={{ objectFit: 'contain' }}/></span>
}
