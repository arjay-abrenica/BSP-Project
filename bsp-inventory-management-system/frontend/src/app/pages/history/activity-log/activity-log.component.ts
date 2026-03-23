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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchActivityLog();
  }

  fetchActivityLog(): void {
    this.http.get<ActivityLog[]>('http://localhost:5000/api/history/activity').subscribe({
      next: (data) => {
        this.activityData = data;
      },
      error: (err) => console.error('Failed to fetch activity log', err)
    });
  }

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }
}
