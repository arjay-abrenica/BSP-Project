import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchRequests();
  }

  fetchRequests(): void {
    this.http.get<RequestHistory[]>('http://localhost:5000/api/history/requests').subscribe({
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
