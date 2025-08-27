import { faker } from "@faker-js/faker";

export const mockStripeSession = {
    id: faker.string.uuid(),
    url: faker.internet.url(),
}