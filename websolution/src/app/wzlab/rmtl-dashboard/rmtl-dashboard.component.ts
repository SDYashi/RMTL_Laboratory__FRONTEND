import { ApplicationRef, Component, OnDestroy, OnInit, NgZone } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  AssignmentPercentageItem,
  BarChartItem,
  LineChartItem,
  TestingBarChartItem,
} from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { AuthService } from 'src/app/core/auth.service';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

Chart.defaults.color = '#334155';
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
Chart.defaults.plugins.tooltip.backgroundColor = '#0f172a';
Chart.defaults.plugins.tooltip.titleColor = '#fff';
Chart.defaults.plugins.tooltip.bodyColor = '#e5e7eb';

interface DashboardMainResponse {
  generated_at?: string;
  counts?: {
    inwards_device: number;
    dispatched_devices: number;
    assigned_for_testing: number;
    not_assigned_for_testing: number;
    testing_completed: number;
    testing_pending: number;
    pending_for_approval: number;
    approval_done: number;
  };
  userwise?: {
    testing_users: any[];
    oic_users: any[];
    store_users: any[];
  };
}

@Component({
  selector: 'app-rmtl-dashboard',
  templateUrl: './rmtl-dashboard.component.html',
  styleUrls: ['./rmtl-dashboard.component.css'],
})
export class RmtlDashboardComponent implements OnInit, OnDestroy {
  currentUser: any | null = null;

  filters = {
    start_date: '',
    end_date: '',
    lab_id: '' as string,
    device_type: '' as '' | 'METER' | 'CT',
  };

  mainData: DashboardMainResponse | null = null;
  labs: any[] = [];

  isLoading = false;
  error: string | null = null;

  private devicesByTypeChart?: Chart;
  private testingProgressChart?: Chart;
  private assignmentPctChart?: Chart;
  private inwardPerDayChart?: Chart;
  private approvalStatusChart?: Chart;
  private testingUsersChart?: Chart;
  private testingUsersShareChart?: Chart;
  private oicUsersChart?: Chart;
  private storeUsersChart?: Chart;

  private devicesByTypeConfig?: ChartConfiguration<'bar'>;
  private testingProgressConfig?: ChartConfiguration<'bar'>;
  private assignmentPctConfig?: ChartConfiguration<'bar'>;
  private inwardPerDayConfig?: ChartConfiguration<'line'>;
  private approvalStatusConfig?: ChartConfiguration<'doughnut'>;
  private testingUsersConfig?: ChartConfiguration<'bar'>;
  private testingUsersShareConfig?: ChartConfiguration<'doughnut'>;
  private oicUsersConfig?: ChartConfiguration<'bar'>;
  private storeUsersConfig?: ChartConfiguration<'bar'>;

  private chartSourcesLoaded = {
    barDevices: false,
    barTesting: false,
    barAssignPct: false,
    lineInward: false,
  };

  private chartDataReady = false;
  private subs: Subscription[] = [];

  private COLORS = {
    blue: '#4f46e5',
    green: '#22c55e',
    orange: '#f97316',
    red: '#ef4444',
    purple: '#a855f7',
    cyan: '#06b6d4',
    yellow: '#eab308',
    gray: '#64748b',
    slate: '#0f172a',
    teal: '#0d9488',
  };

  private BG = {
    blue: 'rgba(79,70,229,0.78)',
    green: 'rgba(34,197,94,0.78)',
    orange: 'rgba(249,115,22,0.78)',
    red: 'rgba(239,68,68,0.78)',
    purple: 'rgba(168,85,247,0.78)',
    cyan: 'rgba(6,182,212,0.78)',
    yellow: 'rgba(234,179,8,0.78)',
    gray: 'rgba(100,116,139,0.78)',
    teal: 'rgba(13,148,136,0.78)',
  };

  constructor(
    private api: ApiServicesService,
    private zone: NgZone,
    private auth: AuthService,
    private appRef: ApplicationRef
  ) {}

  get roles(): string[] {
    const raw = this.currentUser?.roles ?? this.currentUser?.role ?? [];
    const normalize = (v: any): string[] => {
      if (!v) return [];
      if (Array.isArray(v)) {
        return v.flatMap((x) => {
          if (!x) return [];
          if (typeof x === 'string') return [x.toUpperCase()];
          if (typeof x === 'object') {
            const name =
              x.name ??
              x.role ??
              x.role_name ??
              x.code ??
              x.slug ??
              x.title ??
              '';
            return name ? [String(name).toUpperCase()] : [];
          }
          return [String(x).toUpperCase()];
        });
      }
      if (typeof v === 'string') {
        return v
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
      }
      if (typeof v === 'object') {
        const name = v.name ?? v.role ?? v.role_name ?? '';
        return name ? [String(name).toUpperCase()] : [];
      }
      return [String(v).toUpperCase()];
    };
    return Array.from(new Set(normalize(raw)));
  }

  hasRole(role: string): boolean {
    const target = role.toUpperCase();
    return this.roles.some((r) => {
      const rr = String(r).toUpperCase();
      return rr === target || rr === `ROLE_${target}` || rr.includes(target);
    });
  }

  get canSeeMain(): boolean {
    return (
      this.hasRole('ADMIN') ||
      this.hasRole('EXECUTIVE') ||
      this.hasRole('SUPERADMIN')
    );
  }

  ngOnInit(): void {
    this.currentUser = this.auth.currentUser;
    if (!this.currentUser) {
      const ls = localStorage.getItem('current_user');
      this.currentUser = ls ? JSON.parse(ls) : null;
    }

    this.subs.push(
      this.api.getLabs().subscribe({
        next: (res) => (this.labs = res || []),
        error: () => (this.labs = []),
      })
    );

    if (!this.currentUser) {
      this.error = 'User not loaded. Please login again.';
      return;
    }

    this.reload();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.subs.forEach((s) => s.unsubscribe());
  }

  onDateChange(): void {
    this.reload();
  }

  onLabChange(): void {
    this.reload();
  }

  reload(): void {
    this.error = null;
    this.isLoading = true;
    this.mainData = null;

    this.destroyCharts();
    this.chartDataReady = false;
    this.chartSourcesLoaded = {
      barDevices: false,
      barTesting: false,
      barAssignPct: false,
      lineInward: false,
    };

    const { from_date, to_date } = this.getDateRange();

    this.subs.push(
      this.api
        .getDashboardMain({
          from_date,
          to_date,
          lab_id: this.filters.lab_id ? Number(this.filters.lab_id) : undefined,
        })
        .subscribe({
          next: (res: DashboardMainResponse) => {
            this.mainData = res;
            this.buildUserwiseCharts();
            this.buildApprovalStatusChart();
            this.isLoading = false;
            this.renderChartsIfReady();
          },
          error: (err) => this.setError(err),
        })
    );

    this.reloadChartsData(from_date, to_date);
  }

  private getDateRange(): { from_date: string; to_date: string } {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const from_date =
      this.filters.start_date || firstDay.toISOString().split('T')[0];
    const to_date =
      this.filters.end_date || lastDay.toISOString().split('T')[0];
    return { from_date, to_date };
  }

  private setError(err: any) {
    this.error = err?.error?.detail || err?.message || 'Something went wrong';
    this.isLoading = false;
  }

  number(n?: number | null): string {
    return (n ?? 0).toLocaleString();
  }

  private buildChartParams(from_date: string, to_date: string) {
    return {
      lab_id: this.filters.lab_id ? Number(this.filters.lab_id) : undefined,
      from_date,
      to_date,
      device_type: this.filters.device_type || undefined,
    };
  }

  private reloadChartsData(from_date: string, to_date: string): void {
    const p = this.buildChartParams(from_date, to_date);

    this.subs.push(
      this.api.getBarChart(p).subscribe({
        next: (data: BarChartItem[]) => {
          const labels = (data || []).map((x) => x.device_type);
          const counts = (data || []).map((x) => x.count);

          const bgList = Object.values(this.BG);
          const brList = Object.values(this.COLORS);

          this.devicesByTypeConfig = {
            type: 'bar',
            data: {
              labels,
              datasets: [
                {
                  label: 'Total Devices',
                  data: counts,
                  backgroundColor: labels.map((_, i) => bgList[i % bgList.length]),
                  borderColor: labels.map((_, i) => brList[i % brList.length]),
                  borderWidth: 1,
                  borderRadius: 8,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
            },
          };

          this.chartSourcesLoaded.barDevices = true;
          this.renderChartsIfReady();
        },
        error: () => {
          this.chartSourcesLoaded.barDevices = true;
          this.renderChartsIfReady();
        },
      })
    );

    this.subs.push(
      this.api.getTestingBarChart(p).subscribe({
        next: (data: TestingBarChartItem[]) => {
          const labels = (data || []).map((x) => x.device_type);
          const totals = (data || []).map((x) => x.total);
          const completed = (data || []).map((x) => x.completed);

          this.testingProgressConfig = {
            type: 'bar',
            data: {
              labels,
              datasets: [
                {
                  label: 'Completed',
                  data: completed,
                  backgroundColor: this.BG.green,
                  borderColor: this.COLORS.green,
                  borderWidth: 1,
                  borderRadius: 8,
                },
                {
                  label: 'Total',
                  data: totals,
                  backgroundColor: this.BG.blue,
                  borderColor: this.COLORS.blue,
                  borderWidth: 1,
                  borderRadius: 8,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } },
            },
          };

          this.chartSourcesLoaded.barTesting = true;
          this.renderChartsIfReady();
        },
        error: () => {
          this.chartSourcesLoaded.barTesting = true;
          this.renderChartsIfReady();
        },
      })
    );

    this.subs.push(
      this.api.getAssignmentPercentage(p).subscribe({
        next: (data: AssignmentPercentageItem[]) => {
          const labels = (data || []).map((x) => x.device_type);
          const pctValues = (data || []).map((x) => {
            const v = (x as any).percentage ?? '0';
            return parseFloat(String(v).replace('%', '')) || 0;
          });

          this.assignmentPctConfig = {
            type: 'bar',
            data: {
              labels,
              datasets: [
                {
                  label: 'Assigned %',
                  data: pctValues,
                  backgroundColor: pctValues.map((v) =>
                    v >= 80 ? this.BG.green : v >= 50 ? this.BG.yellow : this.BG.red
                  ),
                  borderColor: pctValues.map((v) =>
                    v >= 80 ? this.COLORS.green : v >= 50 ? this.COLORS.yellow : this.COLORS.red
                  ),
                  borderWidth: 1,
                  borderRadius: 8,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, max: 100 } },
            },
          };

          this.chartSourcesLoaded.barAssignPct = true;
          this.renderChartsIfReady();
        },
        error: () => {
          this.chartSourcesLoaded.barAssignPct = true;
          this.renderChartsIfReady();
        },
      })
    );

    this.subs.push(
      this.api.getCompletedActivitiesLine(p).subscribe({
        next: (data: LineChartItem[]) => {
          const sorted = [...(data || [])].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          const labels = sorted.map((x) => this.formatDateLabel(x.date));
          const counts = sorted.map((x) => x.count);

          this.inwardPerDayConfig = {
            type: 'line',
            data: {
              labels,
              datasets: [
                {
                  label: 'Inwarded Devices',
                  data: counts,
                  borderColor: this.COLORS.purple,
                  backgroundColor: 'rgba(168,85,247,0.20)',
                  pointBackgroundColor: this.COLORS.purple,
                  pointBorderColor: '#fff',
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  tension: 0.35,
                  fill: true,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } },
            },
          };

          this.chartSourcesLoaded.lineInward = true;
          this.renderChartsIfReady();
        },
        error: () => {
          this.chartSourcesLoaded.lineInward = true;
          this.renderChartsIfReady();
        },
      })
    );
  }

  private buildApprovalStatusChart(): void {
    const counts = this.mainData?.counts;
    if (!counts) return;

    this.approvalStatusConfig = {
      type: 'doughnut',
      data: {
        labels: ['Pending Approval', 'Approval Done'],
        datasets: [
          {
            data: [
              counts.pending_for_approval ?? 0,
              counts.approval_done ?? 0,
            ],
            backgroundColor: [this.BG.orange, this.BG.green],
            borderColor: [this.COLORS.orange, this.COLORS.green],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    };
  }

  private buildUserwiseCharts(): void {
    const testingUsers = (this.mainData?.userwise?.testing_users || [])
      .filter((u) => (u.total_assigned || 0) > 0 || (u.testing_done || 0) > 0 || (u.testing_pending || 0) > 0 || (u.pending_approval || 0) > 0)
      .sort((a, b) => (b.total_assigned || 0) - (a.total_assigned || 0));

    const oicUsers = (this.mainData?.userwise?.oic_users || [])
      .filter((u) => (u.total_assigned_by_me || 0) > 0 || (u.pending_approval || 0) > 0 || (u.not_assigned || 0) > 0);

    const storeUsers = (this.mainData?.userwise?.store_users || [])
      .filter((u) => (u.inwarded_by_me || 0) > 0 || (u.dispatched_by_me || 0) > 0);

    const testingLabels = testingUsers.map((u) => this.shortName(u.name));
    const testingAssigned = testingUsers.map((u) => u.total_assigned || 0);
    const testingDone = testingUsers.map((u) => u.testing_done || 0);
    const testingPending = testingUsers.map((u) => u.testing_pending || 0);
    const testingPendingApproval = testingUsers.map((u) => u.pending_approval || 0);

    this.testingUsersConfig = {
      type: 'bar',
      data: {
        labels: testingLabels,
        datasets: [
          {
            label: 'Assigned',
            data: testingAssigned,
            backgroundColor: this.BG.blue,
            borderColor: this.COLORS.blue,
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Done',
            data: testingDone,
            backgroundColor: this.BG.green,
            borderColor: this.COLORS.green,
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Pending',
            data: testingPending,
            backgroundColor: this.BG.yellow,
            borderColor: this.COLORS.yellow,
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Pending Approval',
            data: testingPendingApproval,
            backgroundColor: this.BG.orange,
            borderColor: this.COLORS.orange,
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 0,
            },
          },
          y: {
            beginAtZero: true,
          },
        },
      },
    };

    this.testingUsersShareConfig = {
      type: 'doughnut',
      data: {
        labels: testingLabels,
        datasets: [
          {
            data: testingAssigned,
            backgroundColor: this.generatePalette(testingLabels.length),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    };

    const oicLabels = oicUsers.map((u) => this.shortName(u.name));
    this.oicUsersConfig = {
      type: 'bar',
      data: {
        labels: oicLabels,
        datasets: [
          {
            label: 'Assigned',
            data: oicUsers.map((u) => u.total_assigned_by_me || 0),
            backgroundColor: this.BG.cyan,
            borderColor: this.COLORS.cyan,
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Pending Approval',
            data: oicUsers.map((u) => u.pending_approval || 0),
            backgroundColor: this.BG.orange,
            borderColor: this.COLORS.orange,
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Not Assigned',
            data: oicUsers.map((u) => u.not_assigned || 0),
            backgroundColor: this.BG.gray,
            borderColor: this.COLORS.gray,
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true },
        },
      },
    };

    const storeLabels = storeUsers.map((u) => this.shortName(u.name));
    this.storeUsersConfig = {
      type: 'bar',
      data: {
        labels: storeLabels,
        datasets: [
          {
            label: 'Inwarded',
            data: storeUsers.map((u) => u.inwarded_by_me || 0),
            backgroundColor: this.BG.teal,
            borderColor: this.COLORS.teal,
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Dispatched',
            data: storeUsers.map((u) => u.dispatched_by_me || 0),
            backgroundColor: this.BG.red,
            borderColor: this.COLORS.red,
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true },
        },
      },
    };
  }

  private renderChartsIfReady(): void {
    if (this.chartDataReady) return;
    if (this.isLoading || this.error) return;
    if (!this.mainData) return;

    const allReady =
      this.chartSourcesLoaded.barDevices &&
      this.chartSourcesLoaded.barTesting &&
      this.chartSourcesLoaded.barAssignPct &&
      this.chartSourcesLoaded.lineInward;

    if (!allReady) return;

    this.appRef.isStable.pipe(first((v) => v === true)).subscribe(() => {
      requestAnimationFrame(() => this.tryDrawCharts(0));
    });
  }

  private tryDrawCharts(attempt: number) {
    const ids = [
      'devicesByTypeChart',
      'testingProgressChart',
      'assignmentPctChart',
      'approvalStatusChart',
      'testingUsersChart',
      'testingUsersShareChart',
      'oicUsersChart',
      'storeUsersChart',
      'inwardPerDayChart',
    ];

    const allCanvasExist = ids.every((id) => !!document.getElementById(id));

    if (!allCanvasExist) {
      if (attempt < 4) requestAnimationFrame(() => this.tryDrawCharts(attempt + 1));
      else console.warn('Chart canvases not found after retries.', ids);
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.devicesByTypeChart = this.initOrUpdateChart(
        'devicesByTypeChart',
        this.devicesByTypeChart,
        this.devicesByTypeConfig!
      );

      this.testingProgressChart = this.initOrUpdateChart(
        'testingProgressChart',
        this.testingProgressChart,
        this.testingProgressConfig!
      );

      this.assignmentPctChart = this.initOrUpdateChart(
        'assignmentPctChart',
        this.assignmentPctChart,
        this.assignmentPctConfig!
      );

      this.approvalStatusChart = this.initOrUpdateChart(
        'approvalStatusChart',
        this.approvalStatusChart,
        this.approvalStatusConfig!
      );

      this.testingUsersChart = this.initOrUpdateChart(
        'testingUsersChart',
        this.testingUsersChart,
        this.testingUsersConfig!
      );

      this.testingUsersShareChart = this.initOrUpdateChart(
        'testingUsersShareChart',
        this.testingUsersShareChart,
        this.testingUsersShareConfig!
      );

      this.oicUsersChart = this.initOrUpdateChart(
        'oicUsersChart',
        this.oicUsersChart,
        this.oicUsersConfig!
      );

      this.storeUsersChart = this.initOrUpdateChart(
        'storeUsersChart',
        this.storeUsersChart,
        this.storeUsersConfig!
      );

      this.inwardPerDayChart = this.initOrUpdateChart(
        'inwardPerDayChart',
        this.inwardPerDayChart,
        this.inwardPerDayConfig!
      );
    });

    this.chartDataReady = true;
  }

  private initOrUpdateChart(
    canvasId: string,
    chartInstance: Chart | undefined,
    config: ChartConfiguration
  ): Chart {
    if (chartInstance) chartInstance.destroy();

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) {
      console.warn(`Chart canvas not found: ${canvasId}`);
      return chartInstance as any;
    }

    return new Chart(canvas, config);
  }

  private destroyCharts(): void {
    this.devicesByTypeChart?.destroy();
    this.testingProgressChart?.destroy();
    this.assignmentPctChart?.destroy();
    this.inwardPerDayChart?.destroy();
    this.approvalStatusChart?.destroy();
    this.testingUsersChart?.destroy();
    this.testingUsersShareChart?.destroy();
    this.oicUsersChart?.destroy();
    this.storeUsersChart?.destroy();
  }

  private formatDateLabel(iso: string): string {
    const d = new Date(iso);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-GB', { month: 'short' });
    return `${day} ${month}`;
  }

  private shortName(name: string): string {
    if (!name) return '';
    const clean = String(name).trim().replace(/\s+/g, ' ');
    if (clean.length <= 16) return clean;
    return clean.split(' ').slice(0, 2).join(' ');
  }

  private generatePalette(count: number): string[] {
    const palette = [
      this.BG.blue,
      this.BG.green,
      this.BG.orange,
      this.BG.purple,
      this.BG.cyan,
      this.BG.yellow,
      this.BG.red,
      this.BG.gray,
      this.BG.teal,
    ];

    return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
  }
}