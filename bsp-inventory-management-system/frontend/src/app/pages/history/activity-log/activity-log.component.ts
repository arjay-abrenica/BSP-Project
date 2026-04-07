import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

interface ActivityLog {
  activityLogId: string;
  timestamp: string;
  office: string;
  role: string;
  activity: string;
  details: string;
}

interface AuditLog {
  log_id: number;
  user_id: number;
  username: string;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  timestamp: string;
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
  auditData: AuditLog[] = [];
  activeTab: 'activity' | 'audit' = 'activity';

  constructor(private http: HttpClient, private authService: AuthService) {}

  get isSuperadmin(): boolean {
    return this.authService.hasRole(['SUPERADMIN']);
  }

  ngOnInit(): void {
    this.fetchActivityLog();
    if (this.isSuperadmin) {
      this.fetchAuditLog();
    }
  }

  fetchActivityLog(): void {
    this.http.get<ActivityLog[]>('http://localhost:5000/api/history/activity').subscribe({
      next: (data) => {
        this.activityData = data;
      },
      error: (err) => console.error('Failed to fetch activity log', err)
    });
  }

  fetchAuditLog(): void {
    this.http.get<AuditLog[]>('http://localhost:5000/api/history/audit-logs').subscribe({
      next: (data) => {
        this.auditData = data;
      },
      error: (err) => console.error('Failed to fetch audit log', err)
    });
  }

  switchTab(tab: 'activity' | 'audit'): void {
    this.activeTab = tab;
  }

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }
}

