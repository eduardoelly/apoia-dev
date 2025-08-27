##### Obs: Foi um estudo para usar a plataforma Stripe

# ApoiaDev 💰

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.3.2-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6.14.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Stripe-18.4.0-635BFF?style=for-the-badge&logo=stripe&logoColor=white" alt="Stripe" />
  <img src="https://img.shields.io/badge/Tests-232-brightgreen?style=for-the-badge" alt="Tests" />
</div>

<div align="center">
  <h3>Plataforma para criadores de conteúdo monetizarem seu público de forma descomplicada</h3>
  <p>Receba doações diretamente dos seus seguidores através de uma página personalizada e elegante</p>
</div>

---

## 🚀 Sobre o Projeto

**ApoiaDev** é uma plataforma moderna e intuitiva que permite criadores de conteúdo receberem doações de seus seguidores através de páginas personalizadas. Com integração completa ao Stripe para pagamentos seguros e uma interface elegante, o ApoiaDev simplifica o processo de monetização para criadores digitais.

### ✨ Funcionalidades Principais

- 🔐 **Autenticação Social**: Login via GitHub usando NextAuth.js
- 💳 **Pagamentos Seguros**: Integração completa com Stripe para processamento de pagamentos
- 📊 **Dashboard Completo**: Acompanhe suas estatísticas, doações e saldo em tempo real
- 👤 **Perfil Personalizável**: Crie sua página única com nome, bio e URL personalizada
- 📱 **Design Responsivo**: Interface moderna e adaptável para todos os dispositivos
- 💬 **Mensagens de Apoiadores**: Receba mensagens personalizadas junto com as doações
- 🔗 **Links Diretos**: Compartilhe sua página de doações com uma URL amigável

---

## 🚀 Começando


### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/apoia-dev.git
cd apoia-dev
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` baseado no `.env.example`:

### 4. Configure o banco de dados

```bash
# Execute as migrações
npx prisma migrate dev

# Gere o cliente Prisma
npx prisma generate
```

### 5. Execute a aplicação

```bash
# Modo desenvolvimento
npm run dev

# Ou execute os testes
npm run test
```

A aplicação estará disponível em `http://localhost:3000` 🎉

---

### 📊 Cobertura de Testes

- ✅ **API Routes**: Testes completos de endpoints
- ✅ **Server Actions**: Validação de lógica de negócio  
- ✅ **Componentes**: Testes de renderização e interação
- ✅ **Data Access**: Testes de camada de dados
- ✅ **Integração Stripe**: Mocks e simulações de pagamento

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
