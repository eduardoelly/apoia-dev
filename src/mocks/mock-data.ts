import { faker } from "@faker-js/faker";

export const mockData = {
  uuid: () => faker.string.uuid(),
  email: () => faker.internet.email(),
  name: () => faker.person.fullName(),
  sentence: () => faker.lorem.sentence(),
  number: (min: number, max: number) => faker.number.int({ min, max }),
  date: () => new Date('2023-01-01'),
  username: () => faker.internet.username(),
  bio: () => faker.lorem.paragraph(),
  image: () => faker.image.avatar(),
  url: () => faker.internet.url(),
  alphanumeric: (length: number) => faker.string.alphanumeric(length)
}
