/**
 * HOME PAGE (/) - Página Principal do Site do Casamento
 * 
 * Renderiza o site de casamento com todas as seções:
 * 1. Preloader - animação de carregamento
 * 2. Header - navegação
 * 3. Hero Section - banner principal com os noivos
 * 4. Couple Section - informações do casal
 * 5. Event Section - data, local e hora da cerimônia
 * 6. Gifts Section - lista de presentes
 * 7. RSVP Section - confirmação de presença
 * 8. Messages Section - recados dos convidados
 * 9. Footer - rodapé
 */

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Preloader } from "@/components/Preloader";
import { CoupleSection } from "@/components/sections/CoupleSection";
import { EventSection } from "@/components/sections/EventSection";
import { GiftsSection } from "@/components/sections/GiftsSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { MessagesSection } from "@/components/sections/MessagesSection";
import { RsvpSection } from "@/components/sections/RsvpSection";

// A home é cacheada e revalidada a cada 5 min (ISR), em vez de renderizar do
// zero + consultar o banco a CADA visita (force-dynamic). Isso reduz muito o uso
// de CPU/banco na hospedagem compartilhada. O valor do cartão postal (lido do
// banco pelo layout) passa a refletir edições do painel em até 5 min — e o
// Cloudflare já é purgado após alterar o valor, então aparece na hora.
export const revalidate = 300;

export default function Home() {
  return (
    <div id="site-root">
      <Preloader />
      <Header />

      <main>
        <HeroSection />
        <CoupleSection />
        <EventSection />
        <GiftsSection />
        <RsvpSection />
        <MessagesSection />
      </main>

      <Footer />
    </div>
  );
}
