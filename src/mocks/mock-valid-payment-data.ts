import { faker } from "@faker-js/faker";

  export const validPaymentData = {
    slug: faker.lorem.slug(),
    name: faker.person.fullName(),
    message: faker.lorem.sentence(),
    price: faker.number.int({ min: 1500, max: 35000 }), // R$ 15,00 em centavos
    creatorId: faker.string.uuid(),
  }