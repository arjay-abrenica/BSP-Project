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
    isStockDistributionModalOpen: boolean = false;
    activeStockTab: 'distribution' | 'allocation' = 'distribution';

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
        labels: ['FOD', 'CPSMO', 'LSO', 'IAO', 'NSS', 'Administration', 'Finance', 'PMDD', 'ONP', 'OSG'],
        datasets: [
            {
                data: [16, 11, 4, 13, 10, 18, 9, 8, 5, 6],
                backgroundColor: [
                    '#24404C', // Dark Blue - FOD
                    '#F3A160', // Orange - CPSMO
                    '#79C3B6', // Light Teal - LSO
                    '#E1AE58', // Yellow/Gold - IAO
                    '#E96446', // Bright Orange/Red - NSS
                    '#7FC8BE', // Aqua - Administration
                    '#A62244', // Maroon - Finance
                    '#7E8588', // Gray - PMDD
                    '#217DAB', // Blue - ONP
                    '#404243'  // Dark Gray - OSG
                ],
                borderWidth: 0 // Remove white borders between segments
            }
        ]
    };

    public doughnutChartOptions: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '50%', // Make the hole size match the reference image
        plugins: {
            legend: {
                position: 'bottom',
                labels: { 
                    boxWidth: 8, 
                    boxHeight: 8,
                    usePointStyle: true, 
                    pointStyle: 'circle',
                    padding: 15, 
                    font: { size: 9, weight: 'bold' } 
                }
            },
            datalabels: {
                display: false
            }
        }
    };

    public modalDoughnutChartOptions: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '50%', // Make the hole size match the reference image
        plugins: {
            legend: {
                position: 'bottom',
                labels: { 
                    boxWidth: 8, 
                    boxHeight: 8,
                    usePointStyle: true, 
                    pointStyle: 'circle',
                    padding: 10, 
                    font: { size: 9, weight: 'bold' } 
                }
            },
            datalabels: {
                display: true,
                align: 'end',
                anchor: 'end',
                formatter: (value, context) => {
                    return context.chart.data.labels ? context.chart.data.labels[context.dataIndex] + '\n' + value + '%' : value + '%';
                },
                font: {
                    size: 9,
                    weight: 'bold'
                },
                textAlign: 'center',
                color: '#333'
            }
        },
        layout: {
            padding: 40 // Substantially increase space to protect external data labels from being clipped
        }
    };

    // 3. Supply Allocation Status (Horizontal Stacked Bar Chart)
    public allocationChartData: ChartConfiguration<'bar'>['data'] = {
        // Labels ordered from bottom to top as per reference image
        labels: ['LSO', 'Finance', 'ONP', 'OSG', 'Admin', 'IAO', 'CPSMO', 'PMDD', 'NSS', 'FOD'],
        datasets: [
            {
                label: 'Consumed Supply',
                data: [80, 78, 74, 61, 59, 68, 76, 45, 56, 68],
                backgroundColor: '#5a8b66', // Dark green tint for consumed
                barThickness: 25 // make bars slightly slimmer
            },
            {
                label: 'Remaining Supply',
                data: [20, 22, 26, 39, 41, 32, 24, 55, 44, 32],
                backgroundColor: '#c7d4cc', // Light milky green tint for remaining
                barThickness: 25
            }
        ]
    };

    public allocationChartOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // CRITICAL: Makes the bar chart horizontal
        scales: {
            x: { 
                stacked: true, 
                display: false // Hide bottom axis per reference
            },
            y: { 
                stacked: true, 
                grid: { display: false },
                ticks: {
                    font: { size: 10, weight: 'bold' },
                    color: '#333'
                },
                border: { display: false }
            }
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    boxWidth: 8,
                    boxHeight: 8,
                    usePointStyle: true,
                    pointStyle: 'rectRounded',
                    padding: 20,
                    font: { size: 9, weight: 'bold' }
                }
            },
            datalabels: {
                display: true,
                color: '#333',
                font: { size: 8, weight: 'bold' },
                formatter: (value) => value > 0 ? value : '' // Only show label if > 0
            }
        },
        layout: {
            padding: 10
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

    openStockDistributionModal(): void {
        this.isStockDistributionModalOpen = true;
    }

    closeStockDistributionModal(): void {
        this.isStockDistributionModalOpen = false;
        // Optionally reset back to first tab when closed
        this.activeStockTab = 'distribution';
    }

    setActiveStockTab(tab: 'distribution' | 'allocation'): void {
        this.activeStockTab = tab;
    }

}