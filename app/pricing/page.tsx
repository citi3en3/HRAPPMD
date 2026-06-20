import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Coins, Gauge, ShieldCheck } from 'lucide-react';

const tokenPackages = [
  {
    name: 'Starter',
    tokens: 2000,
    price: '19.95',
    description: 'Best for trying audits, job descriptions, and exports.',
  },
  {
    name: 'Growth',
    tokens: 7000,
    price: '49.95',
    description: 'For active teams running regular HR workflows.',
    highlighted: true,
  },
  {
    name: 'Scale',
    tokens: 20000,
    price: '99.95',
    description: 'For larger batches, repeated analysis, and heavier usage.',
  },
];

const tokenBalance = {
  plan: 'Starter',
  total: 2000,
  used: 720,
};

const usedPercent = Math.round((tokenBalance.used / tokenBalance.total) * 100);
const remainingTokens = tokenBalance.total - tokenBalance.used;

function formatTokens(tokens: number) {
  return new Intl.NumberFormat('en-US').format(tokens);
}

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing"
        description="Buy token packs for HR audits, job descriptions, RACI matrices, and exports."
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                Token depletion
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Track how many tokens are left before buying another pack.
              </p>
            </div>
            <Badge variant="secondary">{tokenBalance.plan}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-bold tracking-tight">{formatTokens(remainingTokens)}</p>
                <p className="text-sm text-muted-foreground">tokens remaining</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">{usedPercent}% depleted</p>
                <p className="text-muted-foreground">
                  {formatTokens(tokenBalance.used)} of {formatTokens(tokenBalance.total)} used
                </p>
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-muted" aria-label="Token depletion">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${usedPercent}%` }}
              />
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-xl border border-border p-3">
                <p className="text-muted-foreground">Purchased</p>
                <p className="font-semibold">{formatTokens(tokenBalance.total)}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-muted-foreground">Used</p>
                <p className="font-semibold">{formatTokens(tokenBalance.used)}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-muted-foreground">Remaining</p>
                <p className="font-semibold">{formatTokens(remainingTokens)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Admin developer mode
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Admin accounts run with unlimited tokens while developer mode is active.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-background p-4">
              <p className="text-sm text-muted-foreground">Current admin allowance</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">Unlimited</p>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full bg-muted"
              aria-label="Admin token allowance"
            >
              <div className="h-full w-full rounded-full bg-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Token depletion is disabled for Admin in developer mode. Regular accounts still use
              the balance bar.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tokenPackages.map((pack) => (
          <Card
            key={pack.name}
            className={pack.highlighted ? 'border-primary shadow-md' : undefined}
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  {pack.name}
                </CardTitle>
                {pack.highlighted ? <Badge>Popular</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">{pack.description}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-4xl font-bold tracking-tight">${pack.price}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatTokens(pack.tokens)} tokens
                </p>
              </div>

              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Shared token balance
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Works across all HR tools
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Balance tracked in real time
                </li>
              </ul>

              <Button className="w-full" variant={pack.highlighted ? 'default' : 'outline'}>
                Buy {formatTokens(pack.tokens)} tokens
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
