import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartOptions, Chart } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { DashboardService } from '../../../core/services/dashboard.service';

// Register the datalabels plugin globally for all charts
Chart.register(ChartDataLabels);

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, BaseChartDirective],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
    totalItemsIssued: number = 0;
    percentageStockUsed: number = 0;
    lowStockItems: any[] = [];
    pendingRequests: any[] = [];
    recentActivities: any[] = [];

    isQuarterlyUsageModalOpen: boolean = false;
    isStockDistributionModalOpen: boolean = false;
    activeStockTab: 'distribution' | 'allocation' = 'distribution';

    public barChartData: ChartConfiguration<'bar'>['data'] = {
        labels: ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'],
        datasets: []
    };

    public barChartOptions: ChartOptions<'bar'> | any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 10 } } },
            datalabels: { anchor: 'end', align: 'end', color: '#666', font: { size: 9, weight: 'bold' }, formatter: (value: any) => value > 0 ? value : '' }
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { border: { display: false }, grid: { color: '#f0f0f0' }, ticks: { font: { size: 10 }, stepSize: 10 } }
        }
    };

    public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: ['#24404C', '#F3A160', '#79C3B6', '#E1AE58', '#E96446', '#7FC8BE', '#A62244', '#7E8588', '#217DAB', '#404243'],
            borderWidth: 0
        }]
    };

    public doughnutChartOptions: ChartOptions<'doughnut'> | any = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '50%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 15, font: { size: 9, weight: 'bold' } }
            },
            datalabels: { display: false }
        }
    };

    public modalDoughnutChartOptions: ChartOptions<'doughnut'> | any = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '50%',
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 10, font: { size: 9, weight: 'bold' } } },
            datalabels: {
                display: true,
                align: 'end',
                anchor: 'end',
                formatter: (value: any, context: any) => context.chart.data.labels ? context.chart.data.labels[context.dataIndex] + '\n' + value : value,
                font: { size: 9, weight: 'bold' },
                textAlign: 'center',
                color: '#333'
            }
        },
        layout: { padding: 40 }
    };

    public allocationChartData: ChartConfiguration<'bar'>['data'] = {
        labels: [],
        datasets: [
            { label: 'Consumed Supply', data: [], backgroundColor: '#5a8b66', barThickness: 25 },
            { label: 'Remaining Supply', data: [], backgroundColor: '#c7d4cc', barThickness: 25 }
        ]
    };

    public allocationChartOptions: ChartOptions<'bar'> | any = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
            x: { stacked: true, display: false },
            y: { stacked: true, grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#333' }, border: { display: false } }
        },
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'rectRounded', padding: 20, font: { size: 9, weight: 'bold' } } },
            datalabels: { display: true, color: '#333', font: { size: 8, weight: 'bold' }, formatter: (value: any) => value > 0 ? value : '' }
        },
        layout: { padding: 10 }
    };

    constructor(private dashboardService: DashboardService) { }

    ngOnInit(): void {
        this.loadDashboardData();
    }

    loadDashboardData(): void {
        this.dashboardService.getStats().subscribe({
            next: (data) => {
                this.totalItemsIssued = data.issuedThisMonth;
                this.percentageStockUsed = data.percentageStockUsed;
                this.lowStockItems = data.lowStock;
                this.pendingRequests = data.pendingRequests;
                this.recentActivities = data.recentActivities;

                this.updateQuarterlyChart(data.quarterlyUsage);
                this.updateDistributionChart(data.stockDistribution);
                this.updateAllocationChart(data.allocationStatus);
            },
            error: (err) => console.error('Failed to load dashboard stats', err)
        });
    }

    updateQuarterlyChart(usageData: any[]): void {
        const categories = [...new Set(usageData.map(d => d.label))];
        const quarters = [1, 2, 3, 4];
        const backgroundColors = ['#3f9f4add', '#ee472cdd', '#fedb28dd', '#217DABdd', '#404243dd'];

        this.barChartData = {
            ...this.barChartData,
            datasets: categories.map((cat, index) => ({
                label: cat,
                data: quarters.map(q => {
                    const found = usageData.find(d => d.label === cat && parseInt(d.quarter) === q);
                    return found ? parseInt(found.total_quantity) : 0;
                }),
                backgroundColor: backgroundColors[index % backgroundColors.length],
                barPercentage: 0.8,
                categoryPercentage: 0.8
            }))
        };
    }

    updateDistributionChart(distData: any[]): void {
        this.doughnutChartData = {
            ...this.doughnutChartData,
            labels: distData.map(d => d.label),
            datasets: [{
                ...this.doughnutChartData.datasets[0],
                data: distData.map(d => parseInt(d.value))
            }]
        };
    }

    updateAllocationChart(allocData: any[]): void {
        this.allocationChartData = {
            ...this.allocationChartData,
            labels: allocData.map(d => d.office),
            datasets: [
                { ...this.allocationChartData.datasets[0], data: allocData.map(d => parseInt(d.consumed)) },
                { ...this.allocationChartData.datasets[1], data: allocData.map(d => parseInt(d.remaining)) }
            ]
        };
    }

    openQuarterlyUsageModal(): void { this.isQuarterlyUsageModalOpen = true; }
    closeQuarterlyUsageModal(): void { this.isQuarterlyUsageModalOpen = false; }
    openStockDistributionModal(): void { this.isStockDistributionModalOpen = true; }
    closeStockDistributionModal(): void { this.isStockDistributionModalOpen = false; this.activeStockTab = 'distribution'; }
    setActiveStockTab(tab: 'distribution' | 'allocation'): void { this.activeStockTab = tab; }
}
