import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// As you build these features, you will import them here:
// import { AnalyticsComponent } from '../../../features/dashboard/analytics/analytics.component';
// import { RecentActivityComponent } from '../../../features/dashboard/recent-activity/recent-activity.component';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule], // Add your feature components to this array later
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
    // Properties to hold your dashboard data
    totalSupplies: number = 0;
    pendingRequestsCount: number = 0;
    recentActivities: string[] = [];

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

    approveRequest(): void {
        console.log('Navigating to pending requests...');
        // Logic to navigate or open an approval modal
    }
}