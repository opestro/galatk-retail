import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { normalizeAlgerianPhone, phoneLookupKeys, validateCustomerName } from '../../shared/validation/algerianPhone.js'
import { normalizeEmail } from '../../shared/validation/email.js'
import { hashPassword, verifyPassword } from '../../shared/auth/password.js'
import { signCustomerToken } from '../../shared/auth/jwt.js'
import { customerPresenter } from './presenter.js'
import { CustomerLoginInput, CustomerRegisterInput } from './types.js'
import { MIN_CUSTOMER_PASSWORD_LENGTH } from './constants.js'

const orderInclude = {
  shop: { select: { id: true, name: true, slug: true } },
  lines: {
    include: {
      product: {
        include: {
          family: {
            include: {
              images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
            },
          },
        },
      },
    },
  },
} as const

export function issueCustomerSession(customer: { id: string; name: string; phone: string; email: string | null }) {
  return {
    token: signCustomerToken(customer.id),
    customer: customerPresenter(customer),
  }
}

/**
 * Email + password login for the store client space.
 */
export async function login(input: CustomerLoginInput) {
  const email = normalizeEmail(input.email)
  if (!email) {
    throw new CustomError('VALIDATION_ERROR', 'Please enter a valid email address.', 400)
  }
  if (!input.password || input.password.length < MIN_CUSTOMER_PASSWORD_LENGTH) {
    throw new CustomError('INVALID_CREDENTIALS', 'Invalid email or password', 401)
  }

  const customer = await prisma.customer.findUnique({
    where: { email },
  })

  if (!customer?.passwordHash) {
    throw new CustomError('INVALID_CREDENTIALS', 'Invalid email or password', 401)
  }

  const valid = await verifyPassword(input.password, customer.passwordHash)
  if (!valid) {
    throw new CustomError('INVALID_CREDENTIALS', 'Invalid email or password', 401)
  }

  return issueCustomerSession(customer)
}

/**
 * Creates a client-space account from /login (email + password).
 * Phone is stored so shops can contact the customer about orders.
 */
export async function register(input: CustomerRegisterInput) {
  const name = validateCustomerName(input.name)
  if (!name) {
    throw new CustomError('VALIDATION_ERROR', 'Please enter your full name.', 400)
  }

  const email = normalizeEmail(input.email)
  if (!email) {
    throw new CustomError('VALIDATION_ERROR', 'Please enter a valid email address.', 400)
  }

  const phone = normalizeAlgerianPhone(input.phone)
  if (!phone) {
    throw new CustomError(
      'VALIDATION_ERROR',
      'Please enter a valid Algerian phone number (05, 06, or 07).',
      400,
    )
  }

  const password = input.password?.trim() ?? ''
  if (password.length < MIN_CUSTOMER_PASSWORD_LENGTH) {
    throw new CustomError(
      'VALIDATION_ERROR',
      `Choose a password of at least ${MIN_CUSTOMER_PASSWORD_LENGTH} characters.`,
      400,
    )
  }

  const existingByEmail = await prisma.customer.findUnique({ where: { email } })
  if (existingByEmail?.passwordHash) {
    throw new CustomError(
      'ACCOUNT_EXISTS',
      'This email already has an account. Sign in to continue.',
      409,
    )
  }

  const existingByPhone = await prisma.customer.findFirst({
    where: { phone: { in: phoneLookupKeys(phone) } },
  })
  if (existingByPhone?.passwordHash) {
    throw new CustomError(
      'ACCOUNT_EXISTS',
      'This phone already has an account. Sign in to continue.',
      409,
    )
  }

  const passwordHash = await hashPassword(password)
  const existing = existingByEmail ?? existingByPhone

  const customer = existing
    ? await prisma.customer.update({
        where: { id: existing.id },
        data: { name, email, phone, passwordHash },
      })
    : await prisma.customer.create({
        data: { name, email, phone, passwordHash },
      })

  return issueCustomerSession(customer)
}

export async function getMe(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) {
    throw new CustomError('UNAUTHORIZED', 'Account not found', 401)
  }
  return customerPresenter(customer)
}

/** All online orders placed under this customer's per-shop Client records. */
export async function listOrders(customerId: string) {
  return prisma.onlineOrder.findMany({
    where: { client: { customerId } },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getOrder(customerId: string, orderId: string) {
  const order = await prisma.onlineOrder.findFirst({
    where: { id: orderId, client: { customerId } },
    include: orderInclude,
  })
  if (!order) {
    throw new CustomError('ORDER_NOT_FOUND', 'Order not found', 404)
  }
  return order
}
