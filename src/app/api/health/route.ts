export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    success: true,
    message: 'Viral Flight API is running',
    env: process.env.NODE_ENV || 'development',
  })
}
