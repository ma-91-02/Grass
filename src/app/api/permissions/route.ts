import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { successResponse, unauthorizedError } from "@/lib/api-response"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorizedError()

  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { name: "asc" }],
  })

  return successResponse(permissions)
}
