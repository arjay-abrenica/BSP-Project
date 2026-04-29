import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, timer, switchMap, tap, catchError, of } from 'rxjs';

export interface Notification {
  id: number;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  is_read: boolean;
  time: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private readonly API_URL = 'http://localhost:5000/api/notifications';

  constructor(private http: HttpClient) {
    // Poll for new notifications every 60 seconds
    timer(0, 60000).pipe(
      switchMap(() => this.fetchNotifications()),
      catchError(err => {
        console.error('Polling error', err);
        return of([]);
      })
    ).subscribe();
  }

  fetchNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.API_URL).pipe(
      tap(notifs => {
        this.notificationsSubject.next(notifs);
        const unread = notifs.filter(n => !n.is_read).length;
        this.unreadCountSubject.next(unread);
      })
    );
  }

  markAsRead(id: number): void {
    this.http.put(`${this.API_URL}/${id}/read`, {}).subscribe({
      next: () => {
        const updated = this.notificationsSubject.value.map(n => 
          n.id === id ? { ...n, is_read: true } : n
        );
        this.notificationsSubject.next(updated);
        this.unreadCountSubject.next(updated.filter(n => !n.is_read).length);
      }
    });
  }

  markAllAsRead(): void {
    this.http.put(`${this.API_URL}/mark-all-read`, {}).subscribe({
      next: () => {
        const updated = this.notificationsSubject.value.map(n => ({ ...n, is_read: true }));
        this.notificationsSubject.next(updated);
        this.unreadCountSubject.next(0);
      }
    });
  }
}
