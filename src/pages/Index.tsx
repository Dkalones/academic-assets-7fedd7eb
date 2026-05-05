import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { MaterialsList } from "@/components/MaterialsList";
import { AvisosList } from "@/components/AvisosList";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, Megaphone, BookMarked, Loader2 } from "lucide-react";
import { fetchDisciplinas, type Disciplina } from "@/lib/github";

const Index = () => {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [ativa, setAtiva] = useState<string>("");

  useEffect(() => {
    fetchDisciplinas()
      .then(({ disciplinas }) => {
        setDisciplinas(disciplinas);
        if (disciplinas.length) setAtiva(disciplinas[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      <Header />

      <section className="hero-translucent text-primary-foreground">
        <div className="container py-12 md:py-16">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight max-w-2xl drop-shadow">
            Materiais e avisos das disciplinas
          </h1>
          <p className="mt-3 text-base md:text-lg opacity-95 max-w-2xl drop-shadow">
            Escolha uma disciplina abaixo para ver os materiais e avisos correspondentes.
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
        ) : (
          <Tabs value={ativa} onValueChange={setAtiva} className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-card/70 p-1">
              {disciplinas.map((d) => (
                <TabsTrigger key={d.id} value={d.id} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {d.nome}
                </TabsTrigger>
              ))}
            </TabsList>

            {disciplinas.map((d) => (
              <TabsContent key={d.id} value={d.id} className="space-y-8">
                {d.descricao && (
                  <p className="text-muted-foreground">{d.descricao}</p>
                )}
                <div className="grid gap-10 lg:grid-cols-3">
                  <section className="lg:col-span-2">
                    <div className="flex items-center gap-2 mb-5">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-bold">Materiais — {d.nome}</h2>
                    </div>
                    <MaterialsList disciplinaId={d.id} />
                  </section>
                  <aside>
                    <div className="flex items-center gap-2 mb-5">
                      <Megaphone className="h-5 w-5 text-accent" />
                      <h2 className="text-xl font-bold">Avisos</h2>
                    </div>
                    <AvisosList disciplinaId={d.id} />
                  </aside>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} — Site acadêmico hospedado no GitHub Pages
      </footer>
    </div>
  );
};

export default Index;
