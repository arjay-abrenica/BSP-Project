import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {
  isFilterOpen = false;
  historyData: RequestHistory[] = [];
  filteredData: RequestHistory[] = [];
  paginatedData: RequestHistory[] = [];

  // Filters
  searchQuery: string = '';
  filters = {
    dateType: 'Date Requested',
    startDate: '',
    endDate: '',
    office: '',
    status: ''
  };

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
        this.applyFilters();
      },
      error: (err) => console.error('Failed to fetch requests history', err)
    });
  }

  get uniqueOffices(): string[] {
    return [...new Set(this.historyData.map(item => item.requestingOffice))].filter(Boolean);
  }

  get uniqueStatuses(): string[] {
    return [...new Set(this.historyData.map(item => item.status))].filter(Boolean);
  }

  applyFilters(): void {
    let temp = this.historyData;

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      temp = temp.filter(item => 
        item.risNo?.toLowerCase().includes(q) ||
        item.requestingOffice?.toLowerCase().includes(q)
      );
    }

    if (this.filters.office) {
      temp = temp.filter(item => item.requestingOffice === this.filters.office);
    }

    if (this.filters.status) {
      temp = temp.filter(item => item.status === this.filters.status);
    }

    if (this.filters.startDate && this.filters.endDate) {
      const start = new Date(this.filters.startDate);
      const end = new Date(this.filters.endDate);
      end.setHours(23, 59, 59, 999);
      
      temp = temp.filter(item => {
        const itemDateStr = this.filters.dateType === 'Date Released' ? item.dateReleased : item.dateRequested;
        if (!itemDateStr || itemDateStr === 'N/A') return false;
        
        const itemDate = new Date(itemDateStr);
        return itemDate >= start && itemDate <= end;
      });
    }

    this.filteredData = temp;
    this.currentPage = 1;
    this.updatePagination();
  }

  clearFilters(): void {
    this.filters = { dateType: 'Date Requested', startDate: '', endDate: '', office: '', status: '' };
    this.searchQuery = '';
    this.applyFilters();
    this.isFilterOpen = false;
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage) || 1;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
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
