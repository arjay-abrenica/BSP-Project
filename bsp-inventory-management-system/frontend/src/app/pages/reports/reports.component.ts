import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Need CommonModule for ngFor
import { FormsModule } from '@angular/forms'; // Need FormsModule for ngModel

export interface ReportItem {
  id: string;
  title: string;
  dateGenerated: string;
  reportNumber: string;
  type: 'pdf' | 'xls';
  office: string;
}

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent {
  
  constructor(private authService: AuthService) {}
  
  reports: ReportItem[] = [
    { id: '1', title: 'monthlyReport_Apr2025_CPSMO.pdf', dateGenerated: 'May 21 2025', reportNumber: 'Report # 2025-05542rep', type: 'pdf', office: 'CPSMO' },
    { id: '2', title: 'monthlyReport_Jan2025_ICTU.pdf', dateGenerated: 'May 21 2025', reportNumber: 'Report # 2025-00442rep', type: 'pdf', office: 'ICTU' },
    { id: '3', title: 'monthlyReport_Aug2025_Finance.pdf', dateGenerated: 'May 21 2025', reportNumber: 'Report # 2025-07542rep', type: 'pdf', office: 'Finance' },
    { id: '4', title: 'monthlyReport_Sept2025_PMDD.pdf', dateGenerated: 'May 21 2025', reportNumber: 'Report # 2025-04213rep', type: 'pdf', office: 'PMDD' },
    { id: '5', title: 'monthlyReport_Nov2025_CPSMO.xlsx', dateGenerated: 'May 21 2025', reportNumber: 'Report # 2025-05542rep', type: 'xls', office: 'CPSMO' }
  ];

  selectedReport: ReportItem | null = null;
  isGenerateModalOpen: boolean = false;
  searchQuery: string = '';

  get filteredReports(): ReportItem[] {
    const user = this.authService.currentUserValue;
    let baseList = this.reports;

    // Filter by office if the user is a FOCAL_OFFICER
    if (user && user.role?.toLowerCase() === 'focal_officer') {
      const userOffice = user.office?.toUpperCase();
      baseList = this.reports.filter(r => r.office === userOffice);
    }

    if (!this.searchQuery) {
      return baseList;
    }
    
    const query = this.searchQuery.toLowerCase();
    
    // Automatically filter as you type
    const liveFilteredList = baseList.filter(report => 
      report.title.toLowerCase().includes(query) ||
      report.dateGenerated.toLowerCase().includes(query) ||
      report.reportNumber.toLowerCase().includes(query)
    );

    // Clear the selected report if it gets filtered out of the live list
    if (this.selectedReport && !liveFilteredList.includes(this.selectedReport)) {
      this.selectedReport = null;
    }

    return liveFilteredList;
  }

  selectReport(report: ReportItem) {
    this.selectedReport = report;
  }

  openGenerateModal() {
    this.isGenerateModalOpen = true;
  }

  closeGenerateModal() {
    this.isGenerateModalOpen = false;
  }
}
