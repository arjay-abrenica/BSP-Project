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
  historyData: RequestHistory[] = [];
  paginatedData: RequestHistory[] = [];

  // Pagination state
  currentPage: number = 1;
  itemsPerPage: number = 25;
  totalPages: number = 1;
  Math = Math;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.fetchRequests();
  }

  fetchRequests(): void {
    const user = this.authService.currentUserValue;
    let url = 'http://localhost:5000/api/history/requests';
    
    // If user is FOCAL_OFFICER, filter by their office
    if (user && user.role === 'FOCAL_OFFICER' && user.office && user.office !== 'N/A') {
      url += `?office=${encodeURIComponent(user.office)}`;
    }

    this.http.get<RequestHistory[]>(url).subscribe({
      next: (data) => {
        this.historyData = data;
        this.updatePagination();
      },
      error: (err) => console.error('Failed to fetch requests history', err)
    });
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.historyData.length / this.itemsPerPage) || 1;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedData = this.historyData.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }
}
