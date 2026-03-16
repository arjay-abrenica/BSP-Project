import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Need CommonModule for ngFor
import { FormsModule } from '@angular/forms'; // Need FormsModule for ngModel

export interface ReportItem {
  id: string;
  title: string;
  dateGenerated: string;
  reportNumber: string;
  type: 'pdf' | 'xls';
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent {
  
  reports: ReportItem[] = [
    { id: '1', title: 'monthlyReport_Apr2025.pdf', dateGenerated: 'May 21 2025', reportNumber: 'Report # 2025-05542rep', type: 'pdf' },
    { id: '2', title: 'monthlyReport_Jan2025.pdf', dateGenerated: 'May 21 2025', reportNumber: 'Report # 2025-00442rep', type: 'pdf' },
    { id: '3', title: 'monthlyReport_Aug2025.pdf', dateGenerated: 'May 21 2025', reportNumber: 'Report # 2025-07542rep', type: 'pdf' },
    { id: '4', title: 'monthlyReport_Sept2025.pdf', dateGenerated: 'May 21 2025', reportNumber: 'Report # 2025-04213rep', type: 'pdf' },
    { id: '5', title: 'monthlyReport_Nov2025.xlsx', dateGenerated: 'May 21 2025', reportNumber: 'Report # 2025-05542rep', type: 'xls' }
  ];

  selectedReport: ReportItem | null = null;
  isGenerateModalOpen: boolean = false;
  searchQuery: string = '';

  get filteredReports(): ReportItem[] {
    if (!this.searchQuery) {
      return this.reports;
    }
    
    const query = this.searchQuery.toLowerCase();
    
    // Automatically filter as you type
    const liveFilteredList = this.reports.filter(report => 
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
