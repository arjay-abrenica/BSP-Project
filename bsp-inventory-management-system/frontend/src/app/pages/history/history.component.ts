import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

interface RequestHistory {
  risNo: string;
  requestingOffice: string;
  dateRequested: string;
  dateReleased: string;
  noOfItems: number;
  status: string;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {
  isFilterOpen = false;
  historyData: any[] = [];
  
  // Details Modal
  isDetailsModalOpen = false;
  selectedRequest: any = null;
  requestSteps = [
    { label: 'Pending', status: 'PENDING' },
    { label: 'Approved', status: 'APPROVED' },
    { label: 'Released', status: 'RELEASED' }
  ];

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.fetchRequests();
  }

  fetchRequests(): void {
    const user = this.authService.currentUserValue;
    let url = 'http://localhost:5000/api/history/requests';
    
    // If user is FOCAL_OFFICER, filter by their office
    if (user && (user.role === 'FOCAL_OFFICER' || user.role === 'FOCAL_USER') && user.office && user.office !== 'N/A') {
      url += `?office=${encodeURIComponent(user.office)}`;
    }

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.historyData = data;
      },
      error: (err) => console.error('Failed to fetch requests history', err)
    });
  }

  openDetails(item: any) {
    this.selectedRequest = item;
    this.isDetailsModalOpen = true;
    
    // Fetch items for this request/transaction
    if (item.risNo) {
      this.http.get<any>(`http://localhost:5000/api/scan/ris/${item.risNo}`).subscribe({
        next: (data) => {
          this.selectedRequest.items = data.details;
        },
        error: (err) => console.error('Failed to fetch items', err)
      });
    }
  }

  closeDetails() {
    this.isDetailsModalOpen = false;
    this.selectedRequest = null;
  }

  getStepClass(stepStatus: string): string {
    const currentStatus = this.selectedRequest?.status;
    const statuses = ['PENDING', 'APPROVED', 'PARTIAL', 'RELEASED'];
    
    const currentIndex = statuses.indexOf(currentStatus);
    const stepIndex = statuses.indexOf(stepStatus);

    if (currentStatus === 'REJECTED' || currentStatus === 'CANCELLED') {
        return 'step-error';
    }

    if (stepIndex < currentIndex || currentStatus === 'RELEASED') return 'step-completed';
    if (stepIndex === currentIndex) return 'step-active';
    return 'step-pending';
  }

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }
}
