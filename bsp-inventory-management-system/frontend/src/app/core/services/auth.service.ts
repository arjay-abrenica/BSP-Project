import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth';
  private currentUserSubject = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient, private router: Router) {
    // TEMPORARY: Automatically set superadmin mock user for frontend-only testing
    const mockUser = { username: 'superadmin', role: 'Superadmin', token: 'mock-token', firstName: 'Super', lastName: 'Admin' };
    sessionStorage.setItem('currentUser', JSON.stringify(mockUser));
    this.currentUserSubject.next(mockUser);
  }

  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string): Observable<any> {
    // TEMPORARY: Bypass backend login call
    return new Observable(observer => {
      const user = { username: username || 'superadmin', role: 'Superadmin', token: 'mock-token' };
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUserSubject.next(user);
      observer.next({ user, token: user.token });
      observer.complete();
    });
  }

  logout() {
    // Remove user from storage and set current user to null
    sessionStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return true; // TEMPORARY BYPASS
  }

  hasRole(allowedRoles: string[]): boolean {
    return true; // TEMPORARY BYPASS
  }
}
