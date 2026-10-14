import { StaffPermission, StaffRole } from '@prisma/client'

export interface LoginInput {
  email: string
  password: string
}

export interface StaffProfile {
  id: string
  email: string
  name: string
  role: StaffRole
  permissions: StaffPermission[]
  shopIds: string[]
}

export interface LoginResponse {
  token: string
  staff: StaffProfile
}
