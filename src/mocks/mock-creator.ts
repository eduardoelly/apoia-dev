import { faker } from "@faker-js/faker";

export const mockCreator = {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    connectedStripeAccountId: faker.string.uuid(),
}
