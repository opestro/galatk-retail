import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient, StaffRole } from '@prisma/client'
import { hashPassword } from '../src/shared/auth/password.js'

if (!process.env.DATABASE_URL) {
  config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../config/.env.dev') })
}

const prisma = new PrismaClient()

async function main() {
  const ownerEmail = 'owner@galatk-retail.local'
  const passwordHash = await hashPassword('password123')

  const owner = await prisma.staffUser.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      passwordHash,
      name: 'Shop Owner',
      role: StaffRole.OWNER,
    },
  })

  const shop = await prisma.shop.upsert({
    where: { slug: 'main-shop' },
    update: {},
    create: {
      name: 'Main Shop',
      slug: 'main-shop',
      address: '123 Main Street',
      serviceCity: 'Algiers',
      deliveryFee: 500,
    },
  })

  await prisma.staffShopAssignment.upsert({
    where: { staffId_shopId: { staffId: owner.id, shopId: shop.id } },
    update: {},
    create: { staffId: owner.id, shopId: shop.id },
  })

  const products = [
    { name: 'Cotton Fabric Roll', sellPrice: 2500, description: 'Premium cotton fabric' },
    { name: 'Silk Blend', sellPrice: 4500, description: 'Luxury silk blend material' },
    { name: 'Linen Sheet', sellPrice: 3200, description: 'Natural linen sheet' },
  ]

  for (const p of products) {
    let product = await prisma.product.findFirst({ where: { name: p.name } })

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          sellPrice: p.sellPrice,
          isActive: true,
          availableOnline: true,
        },
      })
    }

    await prisma.shopStock.upsert({
      where: { shopId_productId: { shopId: shop.id, productId: product.id } },
      update: {},
      create: { shopId: shop.id, productId: product.id, quantity: 0 },
    })
  }

  // Second shop for multi-shop testing (US5)
  const shop2 = await prisma.shop.upsert({
    where: { slug: 'branch-shop' },
    update: {},
    create: {
      name: 'Branch Shop',
      slug: 'branch-shop',
      address: '456 Branch Avenue',
      serviceCity: 'Oran',
      deliveryFee: 600,
    },
  })

  const client1 = await prisma.client.upsert({
    where: { phone: '+212600000001' },
    update: {},
    create: {
      shopId: shop.id,
      name: 'Ahmed Benali',
      phone: '+212600000001',
      creditLimit: 1000,
      balance: 0,
    },
  })

  const client2 = await prisma.client.upsert({
    where: { phone: '+213770000002' },
    update: {},
    create: {
      shopId: shop2.id,
      name: 'Fatima Oran',
      phone: '+213770000002',
      creditLimit: 500,
      balance: 0,
    },
  })

  // Backfill pre-002 sales: treat as fully paid at POS
  await prisma.$executeRaw`
    UPDATE "Sale" SET "amountPaid" = "total", "amountOnCredit" = 0
    WHERE "status" = 'COMPLETED' AND "amountPaid" = 0 AND "amountOnCredit" = 0
  `

  const manager = await prisma.staffUser.findFirst({ where: { role: StaffRole.OWNER } })
  if (manager) {
    await prisma.shopCharge.upsert({
      where: { id: 'seed-charge-team-food' },
      update: {},
      create: {
        id: 'seed-charge-team-food',
        shopId: shop.id,
        category: 'team_food',
        amount: 200,
        chargeDate: new Date(),
        note: 'Seed team lunch',
        recordedById: manager.id,
      },
    })
  }

  console.log('Seed complete:', {
    owner: owner.email,
    shops: [shop.slug, shop2.slug],
    clients: [client1.phone, client2.phone],
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
