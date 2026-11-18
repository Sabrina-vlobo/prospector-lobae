import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import type { Prisma } from "../src/generated/prisma/client.js";

// ⚠️ DADOS 100% FICTÍCIOS, só pra demo e prints.
// - nomes inventados, endereços "Rua Fictícia"
// - telefones com DDD 00 (não existe no Brasil)
// - sites em example.com / example.org (domínios reservados pra exemplo)
// Nunca colocar leads reais aqui.

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const leads: Prisma.LeadCreateInput[] = [
  {
    placeId: "demo-001",
    name: "Barbearia Navalha Dourada",
    category: "barbearia",
    city: "Mogi das Cruzes",
    address: "Rua Fictícia, 101 - Centro",
    phone: "(00) 90000-0001",
    websiteType: "none",
    rating: 4.8,
    reviewsCount: 212,
    status: "NOVO",
  },
  {
    placeId: "demo-002",
    name: "Studio Bigode & Cia",
    category: "barbearia",
    city: "Mogi das Cruzes",
    address: "Av. Exemplo, 455 - Vila Demo",
    phone: "(00) 90000-0002",
    website: "https://instagram.com/studio.bigode.demo",
    websiteType: "social",
    rating: 4.6,
    reviewsCount: 98,
    status: "NOVO",
  },
  {
    placeId: "demo-003",
    name: "Doceria Vó Cida",
    category: "confeitaria",
    city: "Suzano",
    address: "Rua dos Testes, 12",
    phone: "(00) 90000-0003",
    websiteType: "none",
    rating: 4.9,
    reviewsCount: 341,
    status: "NOVO",
    score: 88,
    scoreReason: "Nota alta, muitas avaliações e nenhum site: clientes pedem cardápio online.",
    hook: "Várias avaliações perguntam como encomendar bolo sem ir até a loja.",
  },
  {
    placeId: "demo-004",
    name: "Pet Shop Focinho Feliz",
    category: "pet shop",
    city: "Mogi das Cruzes",
    address: "Rua Fictícia, 900",
    phone: "(00) 90000-0004",
    website: "https://linktr.ee/focinhofeliz.demo",
    websiteType: "social",
    rating: 4.4,
    reviewsCount: 76,
    status: "ENVIADO",
    contactedAt: daysFromNow(-3),
    nextFollowupAt: daysFromNow(0),
  },
  {
    placeId: "demo-005",
    name: "Oficina do Zé Exemplo",
    category: "oficina mecânica",
    city: "Suzano",
    address: "Estrada Demo, km 3",
    phone: "(00) 90000-0005",
    websiteType: "none",
    rating: 4.7,
    reviewsCount: 158,
    status: "ENVIADO",
    contactedAt: daysFromNow(-1),
    nextFollowupAt: daysFromNow(2),
  },
  {
    placeId: "demo-006",
    name: "Salão Raízes Crespas",
    category: "salão de beleza",
    city: "Mogi das Cruzes",
    address: "Rua dos Testes, 77",
    phone: "(00) 90000-0006",
    website: "https://facebook.com/raizes.demo",
    websiteType: "social",
    rating: 4.9,
    reviewsCount: 129,
    status: "RESPONDEU",
    contactedAt: daysFromNow(-5),
    notes: "Pediu exemplos de sites de outros salões.",
  },
  {
    placeId: "demo-007",
    name: "Clínica Sorriso Modelo",
    category: "dentista",
    city: "Mogi das Cruzes",
    address: "Av. Exemplo, 1200 - sala 4",
    phone: "(00) 90000-0007",
    website: "https://example.com",
    websiteType: "real",
    rating: 4.5,
    reviewsCount: 64,
    pagespeedScore: 31,
    status: "REUNIAO",
    contactedAt: daysFromNow(-8),
    notes: "Reunião marcada pra quinta às 15h.",
  },
  {
    placeId: "demo-008",
    name: "Hamburgueria Brasa Demo",
    category: "hamburgueria",
    city: "Suzano",
    address: "Rua Fictícia, 333",
    phone: "(00) 90000-0008",
    websiteType: "none",
    rating: 4.3,
    reviewsCount: 287,
    status: "FECHOU",
    contactedAt: daysFromNow(-20),
    notes: "Landing page + cardápio. Entrega em 2 semanas.",
  },
  {
    placeId: "demo-009",
    name: "Academia Força Exemplo",
    category: "academia",
    city: "Mogi das Cruzes",
    address: "Av. Exemplo, 50",
    phone: "(00) 90000-0009",
    website: "https://example.org",
    websiteType: "real",
    rating: 3.9,
    reviewsCount: 45,
    pagespeedScore: 72,
    status: "DESCARTADO",
    notes: "Já tem site razoável, não faz sentido agora.",
  },
  {
    placeId: "demo-010",
    name: "Floricultura Jardim Teste",
    category: "floricultura",
    city: "Suzano",
    address: "Rua dos Testes, 5",
    phone: "(00) 90000-0010",
    website: "https://wa.me/000000000010",
    websiteType: "social",
    rating: 4.8,
    reviewsCount: 53,
    status: "NOVO",
  },
];

async function main() {
  // upsert por placeId: rodar o seed 2x não duplica nada (mesma ideia da busca na Fase 1)
  for (const lead of leads) {
    await prisma.lead.upsert({
      where: { placeId: lead.placeId },
      create: lead,
      update: lead,
    });
  }
  console.log(`Seed: ${leads.length} leads fictícios prontos.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
