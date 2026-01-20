import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md bg-white border-border/50 shadow-xl">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">Página não encontrada</h1>
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            A página que você está procurando não existe ou foi movida.
          </p>
          
          <div className="mt-8">
            <Link href="/" className="inline-flex justify-center w-full px-4 py-3 text-sm font-semibold text-primary-foreground bg-primary rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
              Voltar para o Início
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
