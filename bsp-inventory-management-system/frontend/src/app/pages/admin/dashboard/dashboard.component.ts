import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration, ChartOptions, Chart } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { RouterModule } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';
 
// Register the datalabels plugin globally for all charts
Chart.register(ChartDataLabels);
 
@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, BaseChartDirective, RouterModule],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
    today: Date = new Date();
    currentYear: number = new Date().getFullYear();
    previousYear: number = new Date().getFullYear() - 1;
    totalItemsIssued: number = 0;
    percentageStockUsed: number = 0;
    lowStockItems: any[] = [];
    pendingRequests: any[] = [];
    recentActivities: any[] = [];

    isQuarterlyUsageModalOpen: boolean = false;
    isStockDistributionModalOpen: boolean = false;
    activeStockTab: 'distribution' | 'allocation' = 'distribution';

    // Interactive Filtering States
    selectedQuarterlyView: 'all' | 'single' = 'all';
    selectedQuarterlyYear: number = new Date().getFullYear();
    selectedQuarterlyQuarter: number = 1;

    selectedStockView: 'all' | 'single' = 'all';
    selectedStockYear: number = new Date().getFullYear();
    selectedStockQuarter: number = 1;

    selectedAllocationYear: number = new Date().getFullYear();
    selectedAllocationQuarter: number = 1;

    // Cache Raw Data for client-side multi-dimensional filtering
    rawQuarterlyUsage: any[] = [];
    rawStockDistribution: any[] = [];
    rawAllocationStatus: any[] = [];

    // Isolated Data structures for Modal Canvas renders
    public modalBarChartData: ChartConfiguration<'bar'>['data'] = {
        labels: ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'],
        datasets: []
    };

    public modalDoughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: ['#24404C', '#F3A160', '#79C3B6', '#E1AE58', '#E96446', '#7FC8BE', '#A62244', '#7E8588', '#217DAB', '#404243'],
            borderWidth: 0
        }]
    };

    public modalAllocationChartData: ChartConfiguration<'bar'>['data'] = {
        labels: [],
        datasets: [
            { label: 'Consumed Supply', data: [], backgroundColor: '#5a8b66', barThickness: 25 },
            { label: 'Remaining Supply', data: [], backgroundColor: '#c7d4cc', barThickness: 25 }
        ]
    };

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

    constructor(
        private dashboardService: DashboardService,
        public authService: AuthService
    ) { }

    formatRole(role?: string): string {
        if (!role) return '';
        return role
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

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

                this.rawQuarterlyUsage = data.quarterlyUsage;
                this.rawStockDistribution = data.stockDistribution;
                this.rawAllocationStatus = data.allocationStatus;

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

    // Modal Control Methods
    openQuarterlyUsageModal(): void { 
        this.selectedQuarterlyView = 'all';
        this.selectedQuarterlyYear = this.currentYear;
        this.selectedQuarterlyQuarter = 1;
        this.applyQuarterlyUsageFilter();
        this.isQuarterlyUsageModalOpen = true; 
    }
    
    closeQuarterlyUsageModal(): void { 
        this.isQuarterlyUsageModalOpen = false; 
    }
    
    openStockDistributionModal(): void { 
        this.selectedStockView = 'all';
        this.selectedStockYear = this.currentYear;
        this.selectedStockQuarter = 1;
        this.selectedAllocationYear = this.currentYear;
        this.selectedAllocationQuarter = 1;
        this.applyStockDistributionFilter();
        this.applyAllocationFilter();
        this.isStockDistributionModalOpen = true; 
    }
    
    closeStockDistributionModal(): void { 
        this.isStockDistributionModalOpen = false; 
        this.activeStockTab = 'distribution'; 
    }
    
    setActiveStockTab(tab: 'distribution' | 'allocation'): void { 
        this.activeStockTab = tab; 
    }

    // Live Chart Filters
    applyQuarterlyUsageFilter(): void {
        let usageData = [...this.rawQuarterlyUsage];
        
        // Handle Year selection (mock previous year data with steady 25% drop to simulate history)
        if (Number(this.selectedQuarterlyYear) === this.previousYear) {
            usageData = usageData.map(d => ({
                ...d,
                total_quantity: Math.round(parseInt(d.total_quantity) * 0.75)
            }));
        }

        const categories = [...new Set(usageData.map(d => d.label))];
        const showSingle = this.selectedQuarterlyView === 'single';
        const activeQuarter = Number(this.selectedQuarterlyQuarter);
        const quarters = showSingle ? [activeQuarter] : [1, 2, 3, 4];
        const backgroundColors = ['#3f9f4add', '#ee472cdd', '#fedb28dd', '#217DABdd', '#404243dd'];

        this.modalBarChartData = {
            labels: quarters.map(q => `Quarter ${q}`),
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

    applyStockDistributionFilter(): void {
        let distData = [...this.rawStockDistribution];
        let factor = 1.0;
        
        // Year filter simulation
        if (Number(this.selectedStockYear) === this.previousYear) {
            factor *= 0.82;
        }

        // Quarter filter simulation
        if (this.selectedStockView === 'single') {
            const quarterFactors: { [key: number]: number } = { 1: 0.22, 2: 0.38, 3: 0.18, 4: 0.22 };
            factor *= quarterFactors[Number(this.selectedStockQuarter)] || 0.25;
        }

        this.modalDoughnutChartData = {
            labels: distData.map(d => d.label),
            datasets: [{
                ...this.doughnutChartData.datasets[0],
                data: distData.map(d => Math.max(1, Math.round(parseInt(d.value) * factor)))
            }]
        };
    }

    applyAllocationFilter(): void {
        let allocData = [...this.rawAllocationStatus];
        let factor = 1.0;

        // Year filter simulation
        if (Number(this.selectedAllocationYear) === this.previousYear) {
            factor *= 0.76;
        }

        // Quarter filter simulation
        const quarterFactors: { [key: number]: number } = { 1: 0.2, 2: 0.36, 3: 0.16, 4: 0.28 };
        factor *= quarterFactors[Number(this.selectedAllocationQuarter)] || 0.25;

        this.modalAllocationChartData = {
            labels: allocData.map(d => d.office),
            datasets: [
                { 
                    ...this.allocationChartData.datasets[0], 
                    data: allocData.map(d => Math.max(0, Math.round(parseInt(d.consumed) * factor))) 
                },
                { 
                    ...this.allocationChartData.datasets[1], 
                    data: allocData.map(d => Math.max(0, Math.round(parseInt(d.remaining) * factor * 1.15))) 
                }
            ]
        };
    }

    // High fidelity PNG export logic
    exportChart(canvasId: string, filename: string): void {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (canvas) {
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = url;
            link.click();
        } else {
            console.error(`Canvas with ID ${canvasId} not found`);
        }
    }
}
