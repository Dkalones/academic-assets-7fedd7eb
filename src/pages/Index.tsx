import { Header } from "@/components/Header";
import { MaterialsList } from "@/components/MaterialsList";
import { AvisosList } from "@/components/AvisosList";
import { BookOpen, Megaphone } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-[image:var(--gradient-hero)] text-primary-foreground">
        <div className="container py-16 md:py-20">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight max-w-2xl">
            Materiais e avisos da disciplina
          </h1>
          <p className="mt-4 text-base md:text-lg opacity-90 max-w-2xl">
            Acesse os arquivos compartilhados pela professora e fique por dentro dos avisos da turma.
          </p>
        </div>
      </section>

      <main className="container py-10 md:py-14 grid gap-10 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Materiais disponíveis</h2>
          </div>
          <MaterialsList />
        </section>

        <aside>
          <div className="flex items-center gap-2 mb-5">
            <Megaphone className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-bold">Avisos</h2>
          </div>
          <AvisosList />
        </aside>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} — Site acadêmico hospedado no GitHub Pages
      </footer>
    </div>
  );
};

export default Index;
