import { faker } from "@faker-js/faker";

export const mockDonation = {
    id: faker.string.uuid(),
    donorName: faker.person.fullName(),
    donorMessage: faker.lorem.sentence(),
    userId: 'user-123',
    staus: 'PENDING',
    amount: 1800, // 2000 - 200 (10% taxa)
}

// Para compatibilidade, mantém o objeto estático também
export const mockDonationCompleted = {
    ...mockDonation,
    amount: faker.number.int({ min: 1000, max: 10000 }),
    createdAt: faker.date.recent().toISOString(),
    staus: 'COMPLETED'
}

// Função que gera uma nova doação a cada chamada com dados únicos
export const createMockDonationCompleted = () => ({
    id: faker.string.uuid(), // ID único a cada chamada
    donorName: faker.person.fullName(),
    donorMessage: faker.lorem.sentence(),
    userId: faker.string.uuid(),
    createdAt: faker.date.recent().toISOString(),
    amount: faker.number.int({ min: 1000, max: 10000 }),
    status: 'COMPLETED' as const,
})

