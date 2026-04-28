import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, ChartType } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register the datalabels plugin globally so charts don't crash when trying to use it
Chart.register(ChartDataLabels);

// @ts-ignore
import html2pdf from 'html2pdf.js';

export interface DetailedAnalysisRow {
  office: string;
  totalRequests: number;
  totalIssued: number;
  remarks?: string;
}

export interface StockDistRow {
  category: string; 
  totalItems: number; 
  totalStock: number; 
}

export interface ItemBreakdownRow {
  sku: string;
  itemName: string;
  currentStock: number;
  reorderLevel: number;
  category: string;
}

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.scss']
})
export class AnalysisComponent implements OnInit {

  activeAnalysisTab: 'detailed' | 'trend' | 'distribution' | 'category' | 'efficiency' = 'detailed';

  /* ── Tab A: Detailed ── */
  detailedData: DetailedAnalysisRow[] = [];

  /* ── Modal State & Data ── */
  isModalOpen: boolean = false;
  selectedRow: DetailedAnalysisRow | null = null;

  officeNames: { [key: string]: string } = {
    'OSG': 'Office of the Secretary General',
    'OBS': 'Office of the Board Secretary',
    'ODSG': 'Office of the Deputy Secretary General',
    'ONP': 'Office of the National President',
    'LSO': 'Legal Services Office',
    'FOD': 'Field Operations Division',
    'CPSMO': 'Corporate Planning and Strategic Management Office',
    'ADMIN': 'Administration Division',
    'FINANCE': 'Finance Division',
    'NSS': 'National Scout Shop',
    'IAO': 'Internal Audit Office',
    'PMDD': 'Property Management and Development Division'
  };

  mockItemBreakdown: ItemBreakdownRow[] = [];

  /* ── Tab B: Usage Trend ── */
  trendChartType: 'bar' = 'bar';
  trendChartData: ChartData<'bar'> = {
    labels: ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'],
    datasets: [
      { label: 'Office Stationary', data: [50, 39, 63, 35], backgroundColor: '#1a7a3e' },
      { label: 'Cleaning Supplies', data: [12, 11, 32, 13], backgroundColor: '#e07b39' },
      { label: 'First Aid', data: [25, 23, 15, 31], backgroundColor: '#e8c547' }
    ]
  };
  trendChartOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', font: { size: 10 }, color: '#333' } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
  };

  top5Most = [
    { name: '', pct: '' }, { name: '', pct: '' },
    { name: '', pct: '' }, { name: '', pct: '' },
    { name: '', pct: '' }
  ];
  top5Least = [
    { name: '', pct: '' }, { name: '', pct: '' },
    { name: '', pct: '' }, { name: '', pct: '' },
    { name: '', pct: '' }
  ];

  /* ── Tab C: Stock Distribution ── */
  distChartType: 'doughnut' = 'doughnut';
  distChartData: ChartData<'doughnut'> = {
    labels: ['FOD', 'CPSMO', 'LSO', 'IAO', 'NSS', 'ADMIN', 'FINANCE', 'PMDD', 'OBS', 'OSG', 'ONP'],
    datasets: [{
      data: [16, 11, 4, 3.3, 20, 22, 5, 8, 5, 6, 4],
      backgroundColor: ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7', '#d8f3dc', '#a8dadc', '#457b9d', '#1d3557', '#e76f51'],
      hoverOffset: 4
    }]
  };
  distChartOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: { display: false },
      datalabels: {
        formatter: (v: number, ctx: any) => ctx.chart.data.labels?.[ctx.dataIndex] + '\n' + v,
        font: { size: 9 }, color: '#333', textAlign: 'center'
      }
    }
  };
  stockDistTable: StockDistRow[] = [];

  /* ── Tab D: Supply Category Breakdown ── */
  catChartType: 'doughnut' = 'doughnut';
  catChartData: ChartData<'doughnut'> = {
    labels: ['Office Stationary', 'Cleaning & Sanitation Supplies', 'Printing & Documentation Supplies', 'First Aid & Health Supplies', 'Miscellaneous Office Consumables'],
    datasets: [{
      data: [48, 25, 13.5, 6, 7.5],
      backgroundColor: ['#1a7a3e', '#1d3557', '#e8c547', '#e07b39', '#c77dff'],
      hoverOffset: 4
    }]
  };
  catChartOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: { display: false },
      datalabels: {
        formatter: (v: number, ctx: any) => {
          const label = ctx.chart.data.labels?.[ctx.dataIndex] as string;
          return label + '\n' + v + '%';
        }, font: { size: 9 }, color: '#333', textAlign: 'center'
      }
    }
  };
  topCatUsage: any[] = [];
  topCatValue: any[] = [];

  /* ── Tab E: Allocation Efficiency ── */
  effChartType: 'line' = 'line';
  effChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Allocation Time (day/s)', data: [],
        borderColor: '#1d3557', backgroundColor: 'transparent', pointBackgroundColor: '#1d3557', yAxisID: 'y', tension: 0.4
      },
      {
        label: 'Approval Rate (%)', data: [],
        borderColor: '#1a7a3e', backgroundColor: 'transparent', pointBackgroundColor: '#1a7a3e', yAxisID: 'y1', tension: 0.4
      }
    ]
  };
  effSummary = {
    avgProcessingDays: 0,
    avgItemsPerRequest: 0,
    approvalRate: 0
  };
  effChartOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', align: 'start', labels: { boxWidth: 10, font: { size: 10 } } },
      datalabels: {
        formatter: (v: number) => v, font: { size: 8 }, color: '#333',
        anchor: 'end', align: 'top'
      }
    },
    scales: {
      y: { position: 'left', beginAtZero: true, max: 125, ticks: { stepSize: 25 } },
      y1: { position: 'right', beginAtZero: true, max: 8, grid: { drawOnChartArea: false }, ticks: { stepSize: 2 } }
    }
  };

  constructor(private http: HttpClient) { }
  
  ngOnInit(): void {
    this.fetchIssuanceSummary();
    this.fetchStockDistribution();
    this.fetchLowStockItems();
    this.fetchUsageTrend();
    this.fetchCategoryBreakdown();
    this.fetchAllocationEfficiency();
  }

  fetchIssuanceSummary(): void {
    this.http.get<any[]>('http://localhost:5000/api/reports/issuance-summary').subscribe({
      next: (data) => {
        this.detailedData = data.map(d => ({
          office: d.office || d.acronym || 'UNKNOWN',
          totalRequests: Number(d.total_requests),
          totalIssued: Number(d.total_issued)
        }));
      },
      error: (err) => console.error('Error fetching issuance summary', err)
    });
  }

  fetchStockDistribution(): void {
    this.http.get<any[]>('http://localhost:5000/api/reports/stock-distribution').subscribe({
      next: (data) => {
        this.stockDistTable = data.map(d => ({
          category: d.category || 'UNKNOWN',
          totalItems: Number(d.total_items),
          totalStock: Number(d.total_stock)
        }));
        
        // Update Dist chart with real data 
        const colors = ['#1a7a3e', '#e07b39', '#e8c547', '#1d3557', '#c77dff', '#2d6a4f', '#40916c', '#52b788', '#f4a261', '#e76f51'];
        this.distChartData = {
          labels: this.stockDistTable.map(d => d.category),
          datasets: [{
             ...this.distChartData.datasets[0],
             data: this.stockDistTable.map(d => d.totalStock),
             backgroundColor: this.stockDistTable.map((_, i) => colors[i % colors.length])
          }]
        };
      },
      error: (err) => console.error('Error fetching stock distribution', err)
    });
  }

  fetchLowStockItems(): void {
    this.http.get<any[]>('http://localhost:5000/api/reports/low-stock').subscribe({
      next: (data) => {
        this.mockItemBreakdown = data.map(d => ({
          sku: d.sku || 'N/A',
          itemName: d.item_name,
          currentStock: Number(d.current_stock),
          reorderLevel: Number(d.reorder_level),
          category: d.category_name || 'Uncategorized'
        }));
      },
      error: (err) => console.error('Error fetching low stock items', err)
    });
  }

  fetchUsageTrend(): void {
    this.http.get<any>('http://localhost:5000/api/reports/usage-trend').subscribe({
      next: (data) => {
        // Map Top 5 Most and Least Use
        const totalMost = data.top5Most.reduce((sum: number, item: any) => sum + Number(item.total_issued), 0) || 1;
        this.top5Most = data.top5Most.map((d: any) => ({
          name: d.name,
          pct: Math.round((Number(d.total_issued) / totalMost) * 100) + '%'
        }));
        
        const totalLeast = data.top5Least.reduce((sum: number, item: any) => sum + Number(item.total_issued), 0) || 1;
        this.top5Least = data.top5Least.map((d: any) => ({
          name: d.name,
          pct: Math.round((Number(d.total_issued) / totalLeast) * 100) + '%'
        }));
        
        while (this.top5Most.length < 5) this.top5Most.push({ name: '', pct: '' });
        while (this.top5Least.length < 5) this.top5Least.push({ name: '', pct: '' });

        // Map Chart Data (Quarters by Category)
        const quarters = [1, 2, 3, 4];
        this.trendChartData.labels = ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'];
        
        // Group by category_name
        const grouped: { [key: string]: number[] } = {};
        for (const row of data.chartData) {
          if (!grouped[row.category_name]) {
            grouped[row.category_name] = [0, 0, 0, 0];
          }
          const qIdx = parseInt(row.quarter) - 1;
          if (qIdx >= 0 && qIdx < 4) {
             grouped[row.category_name][qIdx] = Number(row.total_issued);
          }
        }
        
        const colors = ['#1a7a3e', '#e07b39', '#e8c547', '#1d3557', '#c77dff', '#2d6a4f'];
        let cIdx = 0;
        this.trendChartData.datasets = Object.keys(grouped).map(catName => {
          const ds = {
            label: catName,
            data: grouped[catName],
            backgroundColor: colors[cIdx % colors.length]
          };
          cIdx++;
          return ds;
        });
        
        // trigger chart update
        this.trendChartData = { ...this.trendChartData };
      },
      error: (err) => console.error('Error fetching usage trend', err)
    });
  }

  fetchCategoryBreakdown(): void {
    this.http.get<any>('http://localhost:5000/api/reports/category-breakdown').subscribe({
      next: (data) => {
        const totalUsage = data.topUsage.reduce((sum: number, item: any) => sum + Number(item.total_issued), 0) || 1;
        this.topCatUsage = data.topUsage.map((d: any) => ({
          name: d.name,
          pct: Math.round((Number(d.total_issued) / totalUsage) * 100) + '%'
        }));
        
        const totalValue = data.topValue.reduce((sum: number, item: any) => sum + Number(item.total_value), 0) || 1;
        this.topCatValue = data.topValue.map((d: any) => ({
          name: d.name,
          pct: Math.round((Number(d.total_value) / totalValue) * 100) + '%'
        }));

        this.catChartData.labels = data.topUsage.map((d: any) => d.name);
        this.catChartData.datasets[0].data = data.topUsage.map((d: any) => Number(d.total_issued));
        this.catChartData = { ...this.catChartData };
      },
      error: (err) => console.error('Error fetching category breakdown', err)
    });
  }

  fetchAllocationEfficiency(): void {
    this.http.get<any>('http://localhost:5000/api/reports/allocation-efficiency').subscribe({
      next: (data) => {
        if (data.overall) {
           this.effSummary = {
             avgProcessingDays: Number(data.overall.avg_processing_days) || 0,
             avgItemsPerRequest: Number(data.overall.avg_items_per_request) || 0,
             approvalRate: Number(data.overall.approval_rate) || 0
           };
        }
        
        this.effChartData = {
          labels: data.chartData.map((d: any) => d.timeline),
          datasets: [
            {
              ...this.effChartData.datasets[0],
              data: data.chartData.map((d: any) => Number(d.allocation_time_days) || 0)
            },
            {
              ...this.effChartData.datasets[1],
              data: data.chartData.map((d: any) => Number(d.approval_rate) || 0)
            }
          ]
        };
        this.effChartData = { ...this.effChartData };
      },
      error: (err) => console.error('Error fetching allocation efficiency', err)
    });
  }

  setTab(tab: 'detailed' | 'trend' | 'distribution' | 'category' | 'efficiency'): void {
    this.activeAnalysisTab = tab;
  }

  getBadgeClass(condition: string): string {
    if (condition === 'Overstock') return 'badge overstock';
    if (condition === 'Low Stock') return 'badge low-stock';
    return 'badge normal';
  }

  /* ── Modal Methods ── */
  openModal(row: DetailedAnalysisRow): void {
    this.selectedRow = row;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedRow = null;
  }

  getOfficeFullName(abbr: string | undefined): string {
    if (!abbr) return '';
    return this.officeNames[abbr] || 'Department Office';
  }

  exportGraph(reportName: string): void {
    const element = document.querySelector('.chart-tab-layout') as HTMLElement;
    if (!element) return;
    
    const opt = {
      margin:       0.5,
      filename:     `${reportName}_Report.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in' as const, format: 'letter' as const, orientation: 'landscape' as const }
    };

    const header = document.createElement('div');
    header.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px; font-family: sans-serif; width: 100%;">
        <h2 style="color: #1a7a3e; margin: 0; font-size: 24px;">BSP Inventory Analysis</h2>
        <h4 style="color: #666; margin: 5px 0; font-size: 18px;">${reportName.replace(/_/g, ' ')} Report</h4>
        <p style="color: #999; font-size: 12px;">Generated on: ${new Date().toLocaleDateString()}</p>
      </div>
    `;
    element.insertBefore(header, element.firstChild);

    html2pdf().set(opt).from(element).save().then(() => {
       element.removeChild(header);
    }).catch((err: any) => console.error("Error generating pdf", err));
  }

  getRemarksClass(remarks: string | undefined): string {
    if (!remarks) return 'normal';
    if (remarks.includes('High Utilization') || remarks.includes('Near Depletion')) {
      return 'high-util';
    }
    return 'normal';
  }
}
