import { PrismaClient, Role, AuthorizationLevel, WebhookEventType, Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const NUMBER_OF_USERS = 1100;
const NUMBER_OF_SELLERS = 100;
const NUMBER_OF_BUYERS = 1000;
const NUMBER_OF_DEALS = 10000;
const NUMBER_OF_BIDS = 5000;
const NUMBER_OF_WEBHOOK_DELIVERIES = 5000;
const NUMBER_OF_GLOBAL_ERRORS = 100;

async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

function generateApiKey() {
  return faker.string.uuid();
}

function generateSecretKey() {
  return faker.string.alphanumeric(32);
}

async function seedUsers() {
  const emailsSet = new Set<string>();
  const usersData: Prisma.UserCreateManyInput[] = [];

  for (let i = 0; i < NUMBER_OF_USERS; i++) {
    let email;

    do {
      email = faker.internet.email();
    } while (emailsSet.has(email));

    emailsSet.add(email);

    usersData.push({
      name: faker.person.firstName(),
      email,
      password: faker.internet.password(),
      role: i < NUMBER_OF_SELLERS ? Role.SELLER : Role.BUYER,
    });
  }

  const hashedUsers = await Promise.all(
    usersData.map(async (user) => ({
      ...user,
      password: await hashPassword(user.password),
    }))
  );

  console.log(`Seeding ${NUMBER_OF_USERS} users...`);

  try {
    await prisma.user.createMany({ data: hashedUsers });
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta.target.includes('email')) {
      console.error('Duplicate email detected, retrying...');
    } else {
      throw error;
    }
  }
}

async function seedSellers() {
  const users = await prisma.user.findMany({ where: { role: Role.SELLER } });

  const existingSellers = await prisma.seller.findMany(); 
  const existingSellerUserIds = new Set(existingSellers.map(seller => seller.userId));

  const sellersData = users
    .filter(user => !existingSellerUserIds.has(user.id))
    .map((user) => ({
      userId: user.id,
      apiKey: generateApiKey(),
    }));

  console.log(`Seeding ${sellersData.length} sellers...`);
  await prisma.seller.createMany({ data: sellersData });
}

async function seedBuyers() {
  const users = await prisma.user.findMany({ where: { role: Role.BUYER } });

  const existingBuyers = await prisma.buyer.findMany();
  const existingBuyerIds = new Set(existingBuyers.map((buyer) => buyer.userId));

  const buyersData = users
    .filter((user) => !existingBuyerIds.has(user.id)) 
    .map((user) => ({
      userId: user.id,
      webhookUrl: faker.internet.url(),
      secretKey: generateSecretKey(),
    }));

  console.log(`Seeding ${buyersData.length} buyers...`);

  if (buyersData.length > 0) {
    await prisma.buyer.createMany({ data: buyersData });
  }
}

async function seedDeals() {
  const sellers = await prisma.seller.findMany();
  const sellerIds = sellers.map((seller) => seller.id);

  console.log(`Seeding ${NUMBER_OF_DEALS} deals and Discounts...`);

  for (let i = 0; i < NUMBER_OF_DEALS; i++) {
    const deal = {
      name: faker.commerce.productName(),
      description: faker.lorem.sentence(),
      sellerId: faker.helpers.arrayElement(sellerIds),
      totalPrice: parseFloat(faker.commerce.price({ min: 100, max: 5000 })),
      currency: faker.finance.currencyCode(),
      status: faker.helpers.arrayElement(['AVAILABLE', 'SOLD']),
      items: {
        create: Array.from({ length: 3 }).map(() => ({
          name: faker.commerce.product(),
          price: parseFloat(faker.commerce.price({ min: 100, max: 5000 })),
          quantity: faker.number.int({ min: 1, max: 10 }),
        })),
      },
      discount: {
        create: {
          type: faker.helpers.arrayElement(['FLAT', 'PERCENTAGE']),
          amount: parseFloat(faker.commerce.price({ min: 5, max: 500 })),
        },
      },
    };

    await prisma.deal.create({
      data: deal,
    });
  }
}

async function seedBids() {
  const buyers = await prisma.buyer.findMany();
  const deals = await prisma.deal.findMany();

  const bidsData = Array.from({ length: NUMBER_OF_BIDS }).map(() => ({
    amount: parseFloat(faker.commerce.price({ min: 100, max: 5000 })),
    buyerId: faker.helpers.arrayElement(buyers.map((buyer) => buyer.id)),
    dealId: faker.helpers.arrayElement(deals.map((deal) => deal.id)),
  }));

  console.log(`Seeding ${NUMBER_OF_BIDS} bids...`);
  await prisma.bid.createMany({ data: bidsData });
}

async function seedInvoices() {
  const buyers = await prisma.buyer.findMany();
  const deals = await prisma.deal.findMany({
    where: { status: 'SOLD' },
  });

  const existingInvoices = await prisma.invoice.findMany();
  const existingInvoiceDealIds = new Set(existingInvoices.map((invoice) => invoice.dealId));

  const invoicesData = deals
    .filter((deal) => !existingInvoiceDealIds.has(deal.id))
    .map((deal) => ({
      dealId: deal.id,
      buyerId: faker.helpers.arrayElement(buyers.map((buyer) => buyer.id)),
      totalAmount: deal.totalPrice,
    }));

  console.log(`Seeding ${invoicesData.length} invoices...`);
  await prisma.invoice.createMany({ data: invoicesData });
}

async function seedWebhookDeliveries() {
  const buyers = await prisma.buyer.findMany();
  const deals = await prisma.deal.findMany();

  const webhookDeliveriesData = Array.from({ length: NUMBER_OF_WEBHOOK_DELIVERIES }).map(() => ({
    buyerId: faker.helpers.arrayElement(buyers.map((buyer) => buyer.id)),
    dealId: faker.helpers.arrayElement(deals.map((deal) => deal.id)),
    eventType: faker.helpers.arrayElement([WebhookEventType.PRICE_CHANGE, WebhookEventType.STATUS_CHANGE]),
    status: faker.helpers.arrayElement(['PENDING', 'SUCCESS', 'FAILED']),
    attemptCount: faker.number.int({ min: 1, max: 5 }),
  }));

  console.log(`Seeding ${NUMBER_OF_WEBHOOK_DELIVERIES} webhook deliveries...`);
  await prisma.webhookDelivery.createMany({ data: webhookDeliveriesData });
}

async function seedBuyerSellerRelationships() {
  const buyers = await prisma.buyer.findMany();
  const sellers = await prisma.seller.findMany();

  const existingRelationships = await prisma.buyerSeller.findMany();
  const existingPairs = new Set(
    existingRelationships.map((relationship) => `${relationship.buyerId}-${relationship.sellerId}`)
  );

  const buyerSellerData: Prisma.BuyerSellerCreateManyInput[] = [];

  for (let i = 0; i < NUMBER_OF_BUYERS * 2; i++) {
    const buyerId = faker.helpers.arrayElement(buyers.map((buyer) => buyer.id));
    const sellerId = faker.helpers.arrayElement(sellers.map((seller) => seller.id));
    const pairKey = `${buyerId}-${sellerId}`;


    if (!existingPairs.has(pairKey)) {
      buyerSellerData.push({
        buyerId,
        sellerId,
        authorizationLevel: faker.helpers.arrayElement([AuthorizationLevel.VIEW_ONLY, AuthorizationLevel.FULL_ACCESS]),
      });

      existingPairs.add(pairKey);
    }
  }

  console.log(`Seeding ${buyerSellerData.length} buyer-seller relationships...`);

  if (buyerSellerData.length > 0) {
    try {
      await prisma.buyerSeller.createMany({ data: buyerSellerData });
    } catch (error: any) {
      console.error('Error seeding buyer-seller relationships:', error);
    }
  } else {
    console.log('No new buyer-seller relationships to seed.');
  }
}

async function seedGlobalErrors() {
  const globalErrorsData = Array.from({ length: NUMBER_OF_GLOBAL_ERRORS }).map(() => ({
    message: faker.lorem.sentence(),
    code: faker.helpers.arrayElement(['ERR001', 'ERR002', 'ERR003']),
    stackTrace: faker.lorem.paragraph(), 
    context: JSON.stringify({ additionalInfo: faker.lorem.sentence() }),
  }));

  console.log(`Seeding 100 global errors...`);
  await prisma.globalError.createMany({ data: globalErrorsData });
}

async function main() {
  console.time('Seeding Time');

  try {
    await seedUsers();
    await seedSellers();
    await seedBuyers();
    await seedDeals();
    await seedBids();
    await seedInvoices();
    await seedWebhookDeliveries();
    await seedBuyerSellerRelationships();
    await seedGlobalErrors();

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    console.timeEnd('Seeding Time');
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
