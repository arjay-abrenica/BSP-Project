import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

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
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.scss']
})
export class AuditLogComponent implements OnInit {
  auditData: AuditLog[] = [];

  constructor(private http: HttpClient, private authService: AuthService) {}

  get isSuperadmin(): boolean {
    return this.authService.hasRole(['SUPERADMIN']);
  }

  ngOnInit(): void {
    if (this.isSuperadmin) {
      this.fetchAuditLog();
    }
  }

  fetchAuditLog(): void {
    this.http.get<AuditLog[]>('http://localhost:5000/api/history/audit-logs').subscribe({
      next: (data) => {
        this.auditData = data;
      },
      error: (err) => console.error('Failed to fetch audit log', err)
    });
  }
}
