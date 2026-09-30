export interface CustomerLoginInput {
  email: string
  password: string
}

export interface CustomerRegisterInput {
  name: string
  email: string
  phone: string
  password: string
}

export interface CustomerProfile {
  id: string
  name: string
  phone: string
  email: string | null
}
