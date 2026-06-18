import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private apiUrl = 'http://localhost:5000/api/property';

  constructor(private http: HttpClient) { }

  createIar(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/`, payload);
  }

  getAllProperties(filters: any = {}): Observable<any[]> {
    let params = new HttpParams();
    if (filters.type) params = params.set('type', filters.type);
    if (filters.office) params = params.set('office', filters.office);
    if (filters.searchQuery) params = params.set('searchQuery', filters.searchQuery);
    return this.http.get<any[]>(`${this.apiUrl}/`, { params });
  }

  getPropertyDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getPhysicalCountReports(reportType: string, employee: string, asOfDate?: string): Observable<any[]> {
    let params = new HttpParams();
    params = params.set('reportType', reportType);
    params = params.set('employee', employee);
    if (asOfDate) {
      params = params.set('asOfDate', asOfDate);
    }
    return this.http.get<any[]>(`${this.apiUrl}/reports/physical-count`, { params });
  }

  downloadPhysicalCountExcel(reportType: string, employee: string, asOfDate?: string): Observable<Blob> {
    let params = new HttpParams();
    params = params.set('reportType', reportType);
    params = params.set('employee', employee);
    if (asOfDate) {
      params = params.set('asOfDate', asOfDate);
    }
    return this.http.get(`${this.apiUrl}/reports/physical-count/excel`, { params, responseType: 'blob' });
  }

  getPropertyAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics`);
  }

  getNextIarNo(): Observable<{ nextIarNo: string }> {
    return this.http.get<{ nextIarNo: string }>(`${this.apiUrl}/next-iar-no`);
  }

  getAllIars(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/iars`);
  }

  getIarDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/iars/${id}`);
  }

  downloadIarExcel(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/iars/${id}/excel`, { responseType: 'blob' });
  }

  downloadParExcel(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/par`, { responseType: 'blob' });
  }

  downloadIcsExcel(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/ics`, { responseType: 'blob' });
  }

  downloadPtrExcel(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/transfers/${id}/excel`, { responseType: 'blob' });
  }

  previewIarExcel(payload: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/iars/preview-excel`, payload, { responseType: 'blob' });
  }

  createPropertyTransfer(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/transfers`, payload);
  }
}
