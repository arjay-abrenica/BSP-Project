import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-request-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './request-log.component.html',
  styleUrls: ['./request-log.component.scss']
})
export class RequestLogComponent implements OnInit {
  requestLogs: any[] = [];
  filteredLogs: any[] = [];
  searchQuery: string = '';
  isLoading = true;
  
  // Details Modal
  isDetailsModalOpen = false;
  selectedRequest: any = null;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.fetchRequestLogs();
  }

  fetchRequestLogs(): void {
    const user = this.authService.currentUserValue;
    const office_id = user?.office_id || 1;
    
    this.http.get<any[]>(`http://localhost:5000/api/requests/my?office_id=${office_id}&type=log`).subscribe({
      next: (data) => {
        this.requestLogs = data;
        this.filteredLogs = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch request logs', err);
        this.isLoading = false;
      }
    });
  }

  onSearch() {
    if (!this.searchQuery) {
      this.filteredLogs = this.requestLogs;
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredLogs = this.requestLogs.filter(log => 
      (log.reqNumber && log.reqNumber.toLowerCase().includes(q)) || 
      (log.risNumber && log.risNumber.toLowerCase().includes(q)) ||
      (log.purpose && log.purpose.toLowerCase().includes(q)) ||
      (log.status && log.status.toLowerCase().includes(q))
    );
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
}
