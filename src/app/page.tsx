import { FeatureCard } from "@/components/FeatureCard";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth";
import { ArrowRight, HandCoins, Heart, Shield, Zap } from "lucide-react";


export default function Home() {

  async function handleRegister() {
    "use server"
    await signIn("github", { redirectTo: "/dashboard" })
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-100 via-gray-700 to-black">
      <header className="container mx-auto py-6 px-4">
        <div className="flex items-center">
          <div className="flex items-center text-orange-400 font-bold text-xl">
            <HandCoins className="h-6 w-6 mr-2" />
            <span>ApoiaDev</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-12 md:py-24">
          <div className="max-w-3xl mx-auto">
            <div className="text-center space-y-6">
              <div className="inline-block bg-orange-900/30 text-orange-300 px-4 py-1.5 rounded-full text-sm font-medium mb-2 border border-orange-500/20">
                Plataforma para criadores de conteúdo
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-orange-300 to-red-400">
                Monetize seu público de forma descomplicada
              </h1>

              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Receba doações diretamente dos seus seguidores através de uma página personalizada, sem
                complicações.
              </p>

              <div className="pt-4">
                <form action={handleRegister}>
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-orange-500 hover:bg-orange-400 text-white font-medium px-8 h-12 shadow-lg shadow-orange-500/25 transition-all duration-300 hover:shadow-orange-400/30 hover:scale-105"
                  >
                    Começar agora
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>

          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-orange-400" />}
              title="Rápido e simples"
              description="Configure sua página em minutos e comece a receber doações imediatamente."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-orange-400" />}
              title="Pagamentos seguros"
              description="Transações protegidas e transferências automáticas para sua conta bancária."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
