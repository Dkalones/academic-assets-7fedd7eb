import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { MaterialsList } from "@/components/MaterialsList";
import { AvisosList } from "@/components/AvisosList";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Megaphone, BookMarked, Loader2, ArrowLeft, ChevronRight } from "lucide-react";
import { fetchDisciplinas, type Disciplina } from "@/lib/github";

const Index = () => {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionada, setSelecionada] = useState<Disciplina | null>(null);

  useEffect(() => {
    fetchDisciplinas()
      .then(({ disciplinas }) => setDisciplinas(disciplinas))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      <Header />

      <section className="hero-translucent text-primary-foreground">
        <div className="container py-12 md:py-16">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight max-w-2xl drop-shadow">
            {selecionada ? selecionada.nome : "Materiais e avisos das disciplinas"}
          </h1>
          <p className="mt-3 text-base md:text-lg opacity-95 max-w-2xl drop-shadow">
            {selecionada
              ? selecionada.descricao || "Materiais e avisos desta disciplina."
              : "Escolha uma disciplina abaixo para ver os materiais e avisos correspondentes."}
          </p>
        </div>
      </section>

      <main className="container py-10 md:py-14 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando disciplinas...
          </div>
        ) : disciplinas.length === 0 ? (
          <Card className="p-12 text-center space-y-2">
            <BookMarked className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              Nenhuma disciplina cadastrada ainda. A professora pode criar disciplinas pelo painel administrativo.
            </p>
          </Card>
        ) : !selecionada ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {disciplinas.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelecionada(d)}
                className="text-left group"
              >
                <Card className="p-6 h-full transition-[var(--transition-smooth)] hover:shadow-[var(--shadow-card)] hover:border-primary/60 hover:-translate-y-0.5">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookMarked className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-lg group-hover:text-primary transition-colors">
                        {d.nome}
                      </h2>
                      {d.descricao && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{d.descricao}</p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </Card>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <Button variant="outline" size="sm" onClick={() => setSelecionada(null)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar às disciplinas
            </Button>

            <div className="grid gap-10 lg:grid-cols-3">
              <section className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-5">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Materiais — {selecionada.nome}</h2>
                </div>
                <MaterialsList disciplinaId={selecionada.id} />
              </section>
              <aside>
                <div className="flex items-center gap-2 mb-5">
                  <Megaphone className="h-5 w-5 text-accent" />
                  <h2 className="text-xl font-bold">Avisos</h2>
                </div>
                <AvisosList disciplinaId={selecionada.id} />
              </aside>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} — Site acadêmico hospedado no GitHub Pages
      </footer>
    </div>
  );
};

export default Index;
