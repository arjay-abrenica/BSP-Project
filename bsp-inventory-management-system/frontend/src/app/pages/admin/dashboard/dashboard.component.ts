import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartOptions, Chart } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';

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
    // Properties to hold your dashboard data
    totalSupplies: number = 0;
    pendingRequestsCount: number = 0;
    recentActivities: string[] = [];

    // Modal states
    isQuarterlyUsageModalOpen: boolean = false;

    // --- Chart Data & Configuration ---

    // 1. Quarterly Usage (Bar Chart)
    public barChartData: ChartConfiguration<'bar'>['data'] = {
        labels: ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'],
        datasets: [
            { data: [50, 39, 63, 35], label: 'CLP-19MM', backgroundColor: '#3f9f4add', barPercentage: 0.8, categoryPercentage: 0.8 },
            { data: [13, 11, 32, 12], label: 'STP-STD', backgroundColor: '#ee472cdd', barPercentage: 0.8, categoryPercentage: 0.8 },
            { data: [25, 21, 15, 31], label: 'FLD-TAG', backgroundColor: '#fedb28dd', barPercentage: 0.8, categoryPercentage: 0.8 }
        ]
    };

    public barChartOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { boxWidth: 12, padding: 10, font: { size: 10 } }
            },
            datalabels: {
                anchor: 'end',
                align: 'end',
                color: '#666',
                font: {
                    size: 9,
                    weight: 'bold'
                },
                formatter: Math.round
            }
        },
        scales: {
            x: {
                grid: {
                    display: false // Hide vertical lines
                },
                ticks: {
                    font: { size: 10 }
                }
            },
            y: {
                border: {
                    display: false
                },
                grid: {
                    color: '#f0f0f0' // Extra light faint horizontal lines
                },
                ticks: {
                    font: { size: 10 },
                    stepSize: 10
                }
            }
        }
    };

    // 2. Stock Distribution by Office (Doughnut Chart)
    public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
        labels: ['HR', 'Accounting', 'IT', 'Marketing', 'Sales', 'Admin'],
        datasets: [
            {
                data: [35, 10, 20, 15, 5, 15],
                backgroundColor: [
                    '#4285F4', // Blue
                    '#EA4335', // Red
                    '#FBBC04', // Yellow
                    '#34A853', // Green
                    '#38bdf8', // Light Blue
                    '#9f1239'  // Dark Red
                ]
            }
        ]
    };

    public doughnutChartOptions: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { boxWidth: 12, padding: 10, font: { size: 10 } }
            },
            datalabels: {
                display: false // Hide data labels on doughnut chart
            }
        }
    };

    // ----------------------------------

    // Inject your services here via the constructor (e.g., private dashboardService: DashboardService)
    constructor() { }

    // This lifecycle hook runs when the page loads
    ngOnInit(): void {
        this.loadDashboardData();
    }

    loadDashboardData(): void {
        // In a real app, you would call your API service here. 
        // For now, we are using mock data based on your requirements.
        this.totalSupplies = 1250;
        this.pendingRequestsCount = 8;

        this.recentActivities = [
            'John Doe requested 50 Reams of Bond Paper',
            'IT Department allocated 10 Wireless Mice',
            'System generated Quarterly Usage Report'
        ];
    }

    openQuarterlyUsageModal(): void {
        this.isQuarterlyUsageModalOpen = true;
    }

    closeQuarterlyUsageModal(): void {
        this.isQuarterlyUsageModalOpen = false;
    }

}