import { listPrinters } from '@/lib/shipmondo/printers'
export async function GET(){try{return Response.json({data:await listPrinters(),configured:Boolean(process.env.SHIPMONDO_API_USERNAME)})}catch{return Response.json({error:{code:'SHIPMONDO_UNAVAILABLE',message:'Printer service is not configured.'}},{status:503})}}
