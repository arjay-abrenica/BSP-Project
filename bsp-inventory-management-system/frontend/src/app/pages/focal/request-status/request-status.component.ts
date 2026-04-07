import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-request-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './request-status.component.html',
  styleUrls: ['./request-status.component.scss']
})
export class RequestStatusComponent implements OnInit {
  activeRequests: any[] = [];
  isLoading = true;
  
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
    this.fetchActiveRequests();
  }

  fetchActiveRequests(): void {
    const user = this.authService.currentUserValue;
    const office_id = user?.office_id || 1;
    
    this.http.get<any[]>(`http://localhost:5000/api/requests/my?office_id=${office_id}&type=active`).subscribe({
      next: (data) => {
        this.activeRequests = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch active requests', err);
        this.isLoading = false;
      }
    });
  }

  openDetails(item: any) {
    this.selectedRequest = item;
    this.isDetailsModalOpen = true;
    
    // Fetch details
    this.http.get<any[]>(`http://localhost:5000/api/requests/${item.id}/details`).subscribe({
      next: (details) => {
        this.selectedRequest.items = details;
      },
      error: (err) => console.error('Failed to fetch request details', err)
    });
  }

  closeDetails() {
    this.isDetailsModalOpen = false;
    this.selectedRequest = null;
  }

  getStepClass(stepStatus: string, currentStatus: string): string {
    const statuses = ['PENDING', 'APPROVED', 'PARTIAL', 'RELEASED'];
    const currentIndex = statuses.indexOf(currentStatus);
    const stepIndex = statuses.indexOf(stepStatus);

    if (currentStatus === 'REJECTED' || currentStatus === 'CANCELLED') return 'step-error';
    if (stepIndex < currentIndex || currentStatus === 'RELEASED') return 'step-completed';
    if (stepIndex === currentIndex) return 'step-active';
    return 'step-pending';
  }
}
