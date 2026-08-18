import { quoteRequestSchema } from '@/lib/validation'
import { mockQuotes } from '@/lib/shipping'
export async function POST(request:Request){try{const input=quoteRequestSchema.parse(await request.json());return Response.json({data:mockQuotes(input)})}catch{return Response.json({error:{code:'INVALID_REQUEST',message:'Please check the shipment details.'}},{status:400})}}
