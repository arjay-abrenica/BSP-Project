import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface ActivityLog {
  activityLogId: string;
  timestamp: string;
  office: string;
  role: string;
  activity: string;
  details: string;
}

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-log.component.html',
  styleUrls: ['./activity-log.component.scss']
})
export class ActivityLogComponent implements OnInit {
  isFilterOpen = false;
  activityData: ActivityLog[] = [];
  paginatedData: ActivityLog[] = [];

  // Pagination state
  currentPage: number = 1;
  itemsPerPage: number = 25;
  totalPages: number = 1;
  Math = Math;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchActivityLog();
  }

  fetchActivityLog(): void {
    this.http.get<ActivityLog[]>('http://localhost:5000/api/history/activity').subscribe({
      next: (data) => {
        this.activityData = data;
        this.updatePagination();
      },
      error: (err) => console.error('Failed to fetch activity log', err)
    });
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.activityData.length / this.itemsPerPage) || 1;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedData = this.activityData.slice(startIndex, endIndex);
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
