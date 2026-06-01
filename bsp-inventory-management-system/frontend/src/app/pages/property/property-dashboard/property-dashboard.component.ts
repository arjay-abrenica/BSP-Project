import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { RouterModule } from '@angular/router';
import { PropertyService } from '../../../core/services/property.service';

@Component({
  selector: 'app-property-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, RouterModule],
  templateUrl: './property-dashboard.component.html',
  styleUrls: ['./property-dashboard.component.scss']
})
export class PropertyDashboardComponent implements OnInit {
  totalAssetValuation: string = '₱0.00';
  totalTrackedUnits: number = 0;
  parAssetsCount: number = 0;
  parAssetsValuation: string = '₱0.00';
  icsAssetsCount: number = 0;
  icsAssetsValuation: string = '₱0.00';

  recentPropertyIntakes: any[] = [];
  recentMovements: any[] = [];
  isLoading: boolean = true;

  // Double Bar Chart for ICS vs IAR monthly statistics
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'IAR Registered Count',
        data: [],
        backgroundColor: '#2a523b',
        borderRadius: 4
      },
      {
        label: 'PAR Issued (Above 50k)',
        data: [],
        backgroundColor: '#E1AE58',
        borderRadius: 4
      },
      {
        label: 'ICS Issued (Below 50k)',
        data: [],
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
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#24404C', '#F3A160', '#2a523b', '#E1AE58', '#79C3B6', '#E96446', '#4A6984', '#F4B27B', '#43805c'],
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

  constructor(private propertyService: PropertyService) { }

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.isLoading = true;
    this.propertyService.getPropertyAnalytics().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res) {
          // Bind KPIs
          const kpis = res.kpis || {};
          this.totalAssetValuation = this.formatCurrency(kpis.total_valuation);
          this.totalTrackedUnits = parseInt(kpis.total_units, 10) || 0;
          this.parAssetsCount = parseInt(kpis.par_count, 10) || 0;
          this.parAssetsValuation = this.formatCurrency(kpis.par_valuation);
          this.icsAssetsCount = parseInt(kpis.ics_count, 10) || 0;
          this.icsAssetsValuation = this.formatCurrency(kpis.ics_valuation);

          // Bind Bar Chart
          if (res.monthlyTrends && Array.isArray(res.monthlyTrends)) {
            const labels = res.monthlyTrends.map((t: any) => t.label);
            const iarCounts = res.monthlyTrends.map((t: any) => parseInt(t.iar_count, 10) || 0);
            const parCounts = res.monthlyTrends.map((t: any) => parseInt(t.par_count, 10) || 0);
            const icsCounts = res.monthlyTrends.map((t: any) => parseInt(t.ics_count, 10) || 0);

            this.barChartData = {
              labels: labels,
              datasets: [
                { ...this.barChartData.datasets[0], data: iarCounts },
                { ...this.barChartData.datasets[1], data: parCounts },
                { ...this.barChartData.datasets[2], data: icsCounts }
              ]
            };
          }

          // Bind Doughnut Chart
          if (res.officeDistribution && Array.isArray(res.officeDistribution)) {
            const officeLabels = res.officeDistribution.map((o: any) => o.label);
            const officeValues = res.officeDistribution.map((o: any) => parseFloat(o.value) || 0);
            const colors = ['#24404C', '#F3A160', '#2a523b', '#E1AE58', '#79C3B6', '#E96446', '#4A6984', '#F4B27B', '#43805c'];

            this.doughnutChartData = {
              labels: officeLabels,
              datasets: [{
                data: officeValues,
                backgroundColor: colors.slice(0, officeLabels.length),
                borderWidth: 0
              }]
            };
          }

          // Bind Recent Intakes & Movements
          this.recentPropertyIntakes = res.recentIars || [];
          this.recentMovements = res.recentMovements || [];
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load property dashboard analytics:', err);
      }
    });
  }

  private formatCurrency(value: any): string {
    const num = parseFloat(value) || 0;
    return '₱' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
