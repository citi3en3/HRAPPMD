'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { motionPresets } from '@/lib/utils/motion';
import type { RaciCell, RaciValue, RoleStub } from '@/features/raci/schemas/raci.schemas';

const RACI_COLORS: Record<string, string> = {
  R: 'bg-[#1F2179] text-white',
  A: 'bg-[#EE6666] text-white',
  C: 'bg-[#3291C9] text-white',
  I: 'bg-[#28A745] text-white',
};

const RACI_LABELS: Record<string, string> = {
  R: 'Responsible',
  A: 'Accountable',
  C: 'Consulted',
  I: 'Informed',
};

interface RaciDetail {
  id: string;
  name: string;
  roles: RoleStub[];
  cells: RaciCell[];
  createdAt: string;
}

export default function RaciDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [matrix, setMatrix] = useState<RaciDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/raci/${id}`)
      .then((res) => res.json())
      .then(setMatrix)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!matrix) {
    return <div className="py-16 text-center text-muted-foreground">RACI matrix not found.</div>;
  }

  // Build lookup structures
  const cellMap = new Map<string, RaciValue>();
  const roleIds = new Set<string>();
  const activities = new Set<string>();
  for (const cell of matrix.cells) {
    roleIds.add(cell.roleId);
    activities.add(cell.activity);
    cellMap.set(`${cell.roleId}::${cell.activity}`, cell.value);
  }

  const roleTitle = new Map(matrix.roles.map((r) => [r.id, r.title]));
  const roleIdArray = Array.from(roleIds);
  const activityArray = Array.from(activities);

  return (
    <motion.div className="space-y-6" {...motionPresets.fadeIn}>
      <PageHeader
        title={matrix.name}
        description={`Created ${new Date(matrix.createdAt).toLocaleDateString()}`}
      >
        <Button variant="outline" size="sm" onClick={() => router.push('/raci')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(RACI_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 text-sm">
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${RACI_COLORS[key]}`}
            >
              {key}
            </span>
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Activity</th>
                {roleIdArray.map((roleId) => (
                  <th key={roleId} className="p-3 text-center font-medium min-w-[80px]">
                    {roleTitle.get(roleId) ?? roleId.slice(0, 8) + '…'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activityArray.map((activity) => (
                <tr key={activity} className="border-b last:border-b-0">
                  <td className="p-3 font-medium">{activity}</td>
                  {roleIdArray.map((roleId) => {
                    const value = cellMap.get(`${roleId}::${activity}`) || '';
                    return (
                      <td key={roleId} className="p-3 text-center">
                        {value && (
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${RACI_COLORS[value] || 'bg-muted'}`}
                          >
                            {value}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
