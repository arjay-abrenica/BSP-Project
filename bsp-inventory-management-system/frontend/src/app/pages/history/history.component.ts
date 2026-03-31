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
      },
      error: (err) => console.error('Failed to fetch requests history', err)
    });
  }

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }
}
