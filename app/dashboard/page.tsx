import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/page-header';
import { ScoreCard } from '@/components/dashboard/score-card';
import { IssueListCard } from '@/components/dashboard/issue-list-card';
import { QuickActionCard } from '@/components/dashboard/quick-action-card';
import { ProgressWidget } from '@/components/dashboard/progress-widget';

export default function DashboardPage() {
  const t = useTranslations('App');

  return (
    <div>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />

      {/* Score + Progress Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <ScoreCard score={null} />
        <ProgressWidget
          items={[
            { label: t('dashboard.progress.audit'), completed: false },
            { label: t('dashboard.progress.jobDescriptions'), completed: false },
            { label: t('dashboard.progress.raci'), completed: false },
            { label: t('dashboard.progress.exports'), completed: false },
          ]}
        />
        <QuickActionCard />
      </div>

      {/* Issues Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <IssueListCard issues={[]} />
      </div>
    </div>
  );
}
