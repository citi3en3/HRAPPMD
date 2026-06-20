'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RaciGrid } from '@/features/raci/components/raci-grid';
import { Save, Loader2, UserPlus, X } from 'lucide-react';
import type { RaciCell, RaciValue } from '@/features/raci/schemas/raci.schemas';

interface RoleStub {
  id: string;
  title: string;
}

export default function NewRaciPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [activities, setActivities] = useState<string[]>(['']);
  const [dbRoles, setDbRoles] = useState<RoleStub[]>([]);
  const [inlineRoles, setInlineRoles] = useState<RoleStub[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [cells, setCells] = useState<Record<string, RaciValue>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRoles: RoleStub[] = [...dbRoles, ...inlineRoles];

  // Load organization roles
  useEffect(() => {
    fetch('/api/roles')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDbRoles(data);
      })
      .catch(() => {});
  }, []);

  function handleCellChange(roleId: string, activity: string, value: RaciValue) {
    setCells((prev) => ({ ...prev, [`${roleId}::${activity}`]: value }));
  }

  function addActivity() {
    setActivities((prev) => [...prev, '']);
  }

  function updateActivity(index: number, value: string) {
    setActivities((prev) => prev.map((a, i) => (i === index ? value : a)));
  }

  function removeActivity(index: number) {
    setActivities((prev) => prev.filter((_, i) => i !== index));
  }

  function addInlineRole() {
    const trimmed = newRoleName.trim();
    if (!trimmed) return;
    const isDuplicate = allRoles.some((r) => r.title.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) return;
    setInlineRoles((prev) => [
      ...prev,
      { id: `inline-${Date.now()}-${prev.length}`, title: trimmed },
    ]);
    setNewRoleName('');
  }

  function removeInlineRole(id: string) {
    setInlineRoles((prev) => prev.filter((r) => r.id !== id));
    setCells((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${id}::`)) delete next[key];
      }
      return next;
    });
  }

  async function handleSave() {
    const cleanActivities = activities.map((a) => a.trim()).filter(Boolean);
    if (!name.trim()) {
      setError('Matrix name is required');
      return;
    }
    if (cleanActivities.length === 0) {
      setError('At least one activity is required');
      return;
    }
    if (allRoles.length === 0) {
      setError('Add at least one role before saving');
      return;
    }

    // Build cells array from state
    const raciCells: RaciCell[] = [];
    for (const role of allRoles) {
      for (const activity of cleanActivities) {
        const key = `${role.id}::${activity}`;
        const value = cells[key] || '';
        raciCells.push({ roleId: role.id, activity, value });
      }
    }

    if (raciCells.filter((c) => c.value !== '').length === 0) {
      setError('Assign at least one RACI value');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/raci', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), roles: allRoles, cells: raciCells }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message || 'Failed to save');
        return;
      }

      router.push(`/raci/${json.id}`);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New RACI Matrix"
        description="Define activities, assign roles, and clarify accountability."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Matrix Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Matrix Name</Label>
            <Input
              id="name"
              placeholder="e.g. Hiring Process, Onboarding Workflow"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Activities / Tasks</Label>
            {activities.map((activity, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder={`Activity ${i + 1}`}
                  value={activity}
                  onChange={(e) => updateActivity(i, e.target.value)}
                />
                {activities.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeActivity(i)}
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addActivity}>
              + Add Activity
            </Button>
          </div>
        </CardContent>
      </Card>

      {allRoles.length > 0 && activities.filter((a) => a.trim()).length > 0 && (
        <RaciGrid
          roles={allRoles}
          activities={activities.filter((a) => a.trim())}
          cells={cells}
          onCellChange={handleCellChange}
        />
      )}

      {/* Custom roles panel — always visible, essential when no DB roles exist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dbRoles.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {dbRoles.length} role{dbRoles.length !== 1 ? 's' : ''} loaded from Job Descriptions.
              Add extra roles below if needed.
            </p>
          )}

          {inlineRoles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {inlineRoles.map((role) => (
                <span
                  key={role.id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-medium"
                >
                  {role.title}
                  <button
                    type="button"
                    onClick={() => removeInlineRole(role.id)}
                    className="ml-0.5 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${role.title}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              placeholder="Role name (e.g. HR Manager)"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addInlineRole();
                }
              }}
              className="max-w-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addInlineRole}
              disabled={!newRoleName.trim()}
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Add Role
            </Button>
          </div>

          {allRoles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No roles yet. Add a role above or create roles via Job Descriptions.
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/raci')}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Matrix
        </Button>
      </div>
    </div>
  );
}
