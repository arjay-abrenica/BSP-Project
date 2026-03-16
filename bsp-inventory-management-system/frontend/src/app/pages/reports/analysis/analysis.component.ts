import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, ChartType } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register the datalabels plugin globally so charts don't crash when trying to use it
Chart.register(ChartDataLabels);

export interface DetailedAnalysisRow {
  office: string;
  allocatedQuantity: number;
  issuedQuantity: number;
  remainingStock: number;
  allocationUtilization: string;
  reallocationCount: number;
  aveRequestFulfillment: string;
  remarks: string;
}

export interface StockDistRow {
  office: string; totalItems: number; allocated: number; variance: string; condition: string;
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
  detailedData: DetailedAnalysisRow[] = [
    { office: 'OSG', allocatedQuantity: 340, issuedQuantity: 265, remainingStock: 75, allocationUtilization: '78%', reallocationCount: 1, aveRequestFulfillment: '82%', remarks: 'Moderate Usage' },
    { office: 'ONP', allocatedQuantity: 410, issuedQuantity: 402, remainingStock: 8, allocationUtilization: '98%', reallocationCount: 1, aveRequestFulfillment: '97%', remarks: 'Near Depletion' },
    { office: 'IAO', allocatedQuantity: 310, issuedQuantity: 304, remainingStock: 6, allocationUtilization: '98%', reallocationCount: 0, aveRequestFulfillment: '100%', remarks: 'Near Depletion' },
    { office: 'LSO', allocatedQuantity: 420, issuedQuantity: 395, remainingStock: 25, allocationUtilization: '94%', reallocationCount: 2, aveRequestFulfillment: '90%', remarks: 'High Utilization' },
    { office: 'CPSMO', allocatedQuantity: 480, issuedQuantity: 462, remainingStock: 18, allocationUtilization: '96%', reallocationCount: 1, aveRequestFulfillment: '98%', remarks: 'High Utilization' },
    { office: 'PMDD', allocatedQuantity: 275, issuedQuantity: 260, remainingStock: 15, allocationUtilization: '95%', reallocationCount: 0, aveRequestFulfillment: '94%', remarks: 'High Utilization' },
    { office: 'NSS', allocatedQuantity: 260, issuedQuantity: 180, remainingStock: 85, allocationUtilization: '68%', reallocationCount: 1, aveRequestFulfillment: '80%', remarks: 'Underused Allocation' },
    { office: 'Admin', allocatedQuantity: 600, issuedQuantity: 580, remainingStock: 20, allocationUtilization: '97%', reallocationCount: 3, aveRequestFulfillment: '96%', remarks: 'High Utilization' },
    { office: 'Finance', allocatedQuantity: 350, issuedQuantity: 312, remainingStock: 38, allocationUtilization: '89%', reallocationCount: 0, aveRequestFulfillment: '92%', remarks: 'Stable Usage' },
    { office: 'FOD', allocatedQuantity: 390, issuedQuantity: 278, remainingStock: 112, allocationUtilization: '71%', reallocationCount: 0, aveRequestFulfillment: '85%', remarks: 'Underused Allocation' }
  ];

  /* ── Tab B: Usage Trend ── */
  trendChartType: ChartType = 'bar';
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
    { name: 'Bond Paper A4', pct: '92%' }, { name: 'Alcohol (70% Solution)', pct: '85%' },
    { name: 'Ballpoint Pen (Black)', pct: '78%' }, { name: 'Printer Ink (Black HP)', pct: '71%' },
    { name: 'Tissue Roll', pct: '64%' }
  ];
  top5Least = [
    { name: 'Paper Fastener (Metal Clip)', pct: '5%' }, { name: 'Air Freshener (Aerosol)', pct: '8%' },
    { name: 'Staple Wire (No.35)', pct: '10%' }, { name: 'Push Pins (Assorted)', pct: '11%' },
    { name: 'Correction Tape', pct: '12%' }
  ];

  /* ── Tab C: Stock Distribution ── */
  distChartType: ChartType = 'doughnut';
  distChartData: ChartData<'doughnut'> = {
    labels: ['FOD', 'CPSMO', 'LSO', 'IAO', 'NSS', 'Administration', 'Finance', 'PMDD', 'ONP', 'OSG'],
    datasets: [{
      data: [16, 11, 4, 3.3, 20, 22, 5, 8, 5, 6],
      backgroundColor: ['#2d6a4f','#40916c','#52b788','#74c69d','#95d5b2','#b7e4c7','#d8f3dc','#a8dadc','#457b9d','#1d3557'],
      hoverOffset: 4
    }]
  };
  distChartOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: { display: false },
      datalabels: { formatter: (v: number, ctx: any) => ctx.chart.data.labels?.[ctx.dataIndex] + '\n' + v + '%',
        font: { size: 9 }, color: '#333', textAlign: 'center' }
    }
  };
  stockDistTable: StockDistRow[] = [
    { office: 'CPSMO', totalItems: 20, allocated: 860, variance: '+3.6%', condition: 'Normal' },
    { office: 'FOD', totalItems: 25, allocated: 1240, variance: '+2.7%', condition: 'Overstock' },
    { office: 'LSO', totalItems: 35, allocated: 2310, variance: '+3.5%', condition: 'Overstock' },
    { office: 'IAO', totalItems: 15, allocated: 520, variance: '-13.3%', condition: 'Low Stock' },
    { office: 'NSS', totalItems: 22, allocated: 1050, variance: '+5.0%', condition: 'Normal' },
    { office: 'Admin', totalItems: 30, allocated: 1980, variance: '+16.5%', condition: 'Overstock' },
    { office: 'Finance', totalItems: 18, allocated: 740, variance: '-9.8%', condition: 'Normal' },
    { office: 'PMDD', totalItems: 16, allocated: 680, variance: '-2.9%', condition: 'Normal' },
    { office: 'ONP', totalItems: 12, allocated: 530, variance: '+6.0%', condition: 'Normal' },
    { office: 'OSG', totalItems: 28, allocated: 1770, variance: '-6.6%', condition: 'Normal' }
  ];

  /* ── Tab D: Supply Category Breakdown ── */
  catChartType: ChartType = 'doughnut';
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
      datalabels: { formatter: (v: number, ctx: any) => {
        const label = ctx.chart.data.labels?.[ctx.dataIndex] as string;
        return label + '\n' + v + '%';
      }, font: { size: 9 }, color: '#333', textAlign: 'center' }
    }
  };
  topCatUsage = [
    { name: 'Office Stationary', pct: '42%' }, { name: 'Cleaning and Sanitation Supplies', pct: '23%' },
    { name: 'Printing and Documentation Supplies', pct: '15%' }, { name: 'First Aid and Health Supplies', pct: '9%' },
    { name: 'Miscellaneous Office Supplies', pct: '7%' }
  ];
  topCatValue = [
    { name: 'Cleaning and Sanitation Supplies', pct: '33%' }, { name: 'Office Stationary', pct: '28%' },
    { name: 'Printing and Documentation Supplies', pct: '23%' }, { name: 'First Aid and Health Supplies', pct: '9%' },
    { name: 'Miscellaneous Office Supplies', pct: '7%' }
  ];

  /* ── Tab E: Allocation Efficiency ── */
  effChartType: ChartType = 'line';
  effChartData: ChartData<'line'> = {
    labels: ['CPSMO', 'FOD', 'LSO', 'IAO', 'NSS', 'Admin', 'Finance', 'PMDD', 'ONP', 'OSG'],
    datasets: [
      { label: 'Allocation Time (day/s)', data: [95, 91, 96, 88, 52, 97, 90, 91, 97, 54],
        borderColor: '#1d3557', backgroundColor: 'transparent', pointBackgroundColor: '#1d3557', yAxisID: 'y', tension: 0.4 },
      { label: 'Approval Rate (%)', data: [2.8, 3.7, 4.4, 6.5, 3.2, 7.1, 4.8, 6.3, 5.7, 6.3],
        borderColor: '#1a7a3e', backgroundColor: 'transparent', pointBackgroundColor: '#1a7a3e', yAxisID: 'y1', tension: 0.4 }
    ]
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

  constructor() {}
  ngOnInit(): void {}

  setTab(tab: 'detailed' | 'trend' | 'distribution' | 'category' | 'efficiency'): void {
    this.activeAnalysisTab = tab;
  }

  getBadgeClass(condition: string): string {
    if (condition === 'Overstock') return 'badge overstock';
    if (condition === 'Low Stock') return 'badge low-stock';
    return 'badge normal';
  }
}
