import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/logo';
import { LanguageToggle } from '@/components/i18n/language-toggle';
import { ArrowRight, ClipboardCheck, FileText, Grid3X3, BarChart3, Sparkles } from 'lucide-react';

const features = [
  {
    icon: ClipboardCheck,
    title: 'AI Organizational Audit',
    description: "Assess your organization's HR maturity in minutes with a guided wizard.",
  },
  {
    icon: FileText,
    title: 'Job Description Generator',
    description: 'Generate structured, professional job descriptions powered by AI.',
  },
  {
    icon: Grid3X3,
    title: 'RACI Matrix Builder',
    description: 'Map roles and responsibilities with an interactive matrix editor.',
  },
  {
    icon: BarChart3,
    title: 'Results & Insights',
    description: 'Visualize your organizational progress and track key metrics.',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <LogoMark className="h-9 w-9" />
            <span className="text-lg font-bold tracking-tight">HRI</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            AI-Powered HR Intelligence
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Structure your
            <br />
            <span className="text-primary">organization</span> in minutes
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            HRI transforms unstructured organizations into structured systems — without requiring HR
            expertise. Run audits, generate job descriptions, and map responsibilities with AI.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="text-base px-8">
                Start Free <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-base px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/30 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need to structure your team
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">
              From audit to action — HRI guides you through every step.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>HRI — Human Resources Intelligence</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} HRI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
