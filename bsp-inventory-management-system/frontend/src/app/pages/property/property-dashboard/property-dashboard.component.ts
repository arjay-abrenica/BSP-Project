import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartOptions, Chart } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-property-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, RouterModule],
  templateUrl: './property-dashboard.component.html',
  styleUrls: ['./property-dashboard.component.scss']
})
export class PropertyDashboardComponent implements OnInit {
  totalAssetValuation: string = '₱4,825,600.00';
  totalTrackedUnits: number = 184;
  parAssetsCount: number = 42;
  parAssetsValuation: string = '₱3,950,000.00';
  icsAssetsCount: number = 142;
  icsAssetsValuation: string = '₱875,600.00';

  recentPropertyIntakes = [
    { iar_no: 'BSP-IAR-2026-0089', date: new Date('2026-05-18T10:30:00'), officer: 'Sir Jerry', items: '10 Units - HP EliteBook 840 (Above 50k)', type: 'PAR', status: 'ACTIVE' },
    { iar_no: 'BSP-IAR-2026-0088', date: new Date('2026-05-15T14:15:00'), officer: 'Sir Jerry', items: '25 Units - Ergonomic Office Chairs (Below 50k)', type: 'ICS', status: 'ACTIVE' },
    { iar_no: 'BSP-IAR-2026-0087', date: new Date('2026-05-10T09:00:00'), officer: 'Sir Jerry', items: '2 Units - Canon Heavy Duty Copier (Above 50k)', type: 'PAR', status: 'ACTIVE' },
    { iar_no: 'BSP-IAR-2026-0086', date: new Date('2026-05-08T11:45:00'), officer: 'Sir Jerry', items: '5 Units - Epson Projectors (Below 50k)', type: 'ICS', status: 'ACTIVE' },
    { iar_no: 'BSP-IAR-2026-0085', date: new Date('2026-05-02T16:00:00'), officer: 'Sir Jerry', items: '15 Units - Steel Filing Cabinets (Below 50k)', type: 'ICS', status: 'ACTIVE' }
  ];

  recentMovements = [
    { description: 'MacBook Pro M3 issued to OSG (PAR)', date: new Date('2026-05-19') },
    { description: '10 Ergonomic Chairs distributed to FOD (ICS)', date: new Date('2026-05-18') },
    { description: 'EPSON L3250 Printer sent to Finance (ICS)', date: new Date('2026-05-15') },
    { description: 'Executive Desk registered for National President (PAR)', date: new Date('2026-05-12') }
  ];

  // Double Bar Chart for ICS vs IAR monthly statistics
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [
      {
        label: 'IAR Registered Count',
        data: [12, 19, 15, 24, 30],
        backgroundColor: '#005E38',
        borderRadius: 4
      },
      {
        label: 'PAR Issued (Above 50k)',
        data: [3, 5, 4, 8, 10],
        backgroundColor: '#E1AE58',
        borderRadius: 4
      },
      {
        label: 'ICS Issued (Below 50k)',
        data: [9, 14, 11, 16, 20],
        backgroundColor: '#79C3B6',
        borderRadius: 4
      }
    ]
  };

  public barChartOptions: ChartOptions<'bar'> | any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, padding: 12, font: { size: 10, weight: 'bold' } }
      },
      datalabels: { display: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { border: { display: false }, grid: { color: '#f0f0f0' }, ticks: { font: { size: 10 } } }
    }
  };

  // Doughnut Chart for Property Allocation by Division
  public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['OSG', 'FOD', 'ADMIN', 'FINANCE', 'PMDD', 'OBS'],
    datasets: [{
      data: [1250000, 850000, 1150000, 620000, 480600, 475000],
      backgroundColor: ['#24404C', '#F3A160', '#005E38', '#E1AE58', '#79C3B6', '#E96446'],
      borderWidth: 0
    }]
  };

  public doughnutChartOptions: ChartOptions<'doughnut'> | any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 10, font: { size: 9, weight: 'bold' } }
      },
      datalabels: {
        display: false
      }
    }
  };

  constructor() { }

  ngOnInit(): void { }
}
