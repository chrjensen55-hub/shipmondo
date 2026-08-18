import { describe, expect, it } from 'vitest'
import { calculateCustomerPrice, chargeableWeight, requiresCustoms, volumetricWeight } from './shipping'
const parcel={id:'p1',weight:2,length:50,width:40,height:30}
describe('weight calculations',()=>{it('calculates volumetric weight',()=>expect(volumetricWeight(parcel)).toBe(12));it('uses the larger chargeable weight',()=>expect(chargeableWeight(parcel)).toBe(12));it('uses actual weight when larger',()=>expect(chargeableWeight({...parcel,weight:15})).toBe(15))})
describe('pricing',()=>{it('combines percentage and fixed markup',()=>expect(calculateCustomerPrice(128,{percentage:35,fixed:25})).toBe(198));it('protects minimum margin',()=>expect(calculateCustomerPrice(100,{percentage:5,minimumMargin:50})).toBe(150));it('rounds upward to configured increment',()=>expect(calculateCustomerPrice(101,{percentage:20,rounding:5})).toBe(125))})
describe('customs rules',()=>{it('does not require customs within EU',()=>expect(requiresCustoms('DK','DE')).toBe(false));it('requires customs across EU boundary',()=>expect(requiresCustoms('DK','NO')).toBe(true))})
