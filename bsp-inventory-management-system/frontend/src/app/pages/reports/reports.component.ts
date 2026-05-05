import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; 
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

export interface ReportItem {
  id: string;
  title: string;
  dateGenerated: string;
  reportNumber: string;
  type: 'pdf' | 'xls';
  office: string;
  fileData?: string; 
  category?: string;
}

export interface DashboardMetrics {
  totalRequests: number;
  totalIssued: number;
  lowStockCount: number;
  topCategory: string;
}

import { AuthService } from '../../core/services/auth.service';

// @ts-ignore
import html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  
  constructor(
    private authService: AuthService, 
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) {}
  
  // Modal Fields
  selectedReportType: 'inventory' | 'rsmi' | 'summary' = 'inventory';
  selectedMonth: string = '';
  selectedYear: string = '';
  selectedFormat: 'pdf' | 'excel' = 'pdf';
  
  reports: ReportItem[] = [];
  metrics: DashboardMetrics = {
    totalRequests: 0,
    totalIssued: 0,
    lowStockCount: 0,
    topCategory: 'N/A'
  };

  selectedReport: ReportItem | null = null;
  isGenerateModalOpen: boolean = false;
  isGenerating: boolean = false;
  searchQuery: string = '';
  filterType: string = 'all';

  public monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  private monthMap: { [key: string]: string } = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };

  ngOnInit() {
    const today = new Date();
    this.selectedMonth = this.monthNames[today.getMonth()];
    this.selectedYear = today.getFullYear().toString();

    this.loadReports();
    this.fetchDashboardMetrics();
  }

  private loadReports() {
    this.http.get<ReportItem[]>('http://localhost:5000/api/reports/generated').subscribe({
      next: (data) => {
        this.reports = data;
      },
      error: (err) => console.error('Failed to load reports archive', err)
    });
  }

  private fetchDashboardMetrics() {
    const issuanceSummary$ = this.http.get<any[]>('http://localhost:5000/api/reports/issuance-summary');
    const lowStock$ = this.http.get<any[]>('http://localhost:5000/api/reports/low-stock');
    const categories$ = this.http.get<any>('http://localhost:5000/api/reports/category-breakdown');

    forkJoin({
      issuances: issuanceSummary$,
      lowStock: lowStock$,
      categories: categories$
    }).subscribe({
      next: (res) => {
        this.metrics.totalRequests = res.issuances.reduce((acc, curr) => acc + parseInt(curr.total_requests || 0), 0);
        this.metrics.totalIssued = res.issuances.reduce((acc, curr) => acc + parseInt(curr.total_issued || 0), 0);
        this.metrics.lowStockCount = res.lowStock.length;
        this.metrics.topCategory = res.categories?.topUsage?.[0]?.name || 'N/A';
      },
      error: (err) => console.error('Failed to fetch dashboard metrics', err)
    });
  }

  getSafeUrl(dataUrl?: string): SafeResourceUrl | null {
    if (!dataUrl) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl);
  }

  get filteredReports(): ReportItem[] {
    const user = this.authService.currentUserValue;
    let baseList = this.reports;

    if (user && user.role?.toLowerCase() === 'focal_officer') {
      const userOffice = user.office?.toUpperCase();
      baseList = baseList.filter(r => r.office === userOffice);
    }

    if (this.filterType !== 'all') {
      baseList = baseList.filter(r => r.type === this.filterType);
    }

    if (!this.searchQuery) {
      return baseList;
    }
    
    const query = this.searchQuery.toLowerCase();
    return baseList.filter(report => 
      report.title.toLowerCase().includes(query) ||
      report.dateGenerated.toLowerCase().includes(query) ||
      report.reportNumber.toLowerCase().includes(query)
    );
  }

  selectReport(report: ReportItem) {
    this.selectedReport = report;
  }

  deleteReport(report: ReportItem, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this report permanently?')) {
      this.http.delete(`http://localhost:5000/api/reports/generated/${report.id}`).subscribe({
        next: () => {
          this.reports = this.reports.filter(r => r.id !== report.id);
          if (this.selectedReport?.id === report.id) this.selectedReport = null;
        },
        error: (err) => alert('Failed to delete report from server.')
      });
    }
  }

  openGenerateModal() {
    this.isGenerateModalOpen = true;
  }

  closeGenerateModal() {
    this.isGenerateModalOpen = false;
  }

  generateReport() {
    if (this.selectedFormat === 'excel') {
      alert('Excel generation is currently in development. Generating high-fidelity PDF instead.');
      this.selectedFormat = 'pdf';
    }

    this.isGenerating = true;
    const monthNum = this.monthMap[this.selectedMonth];
    
    let endpoint = '';
    if (this.selectedReportType === 'inventory') {
      endpoint = `http://localhost:5000/api/reports/monthly-inventory?month=${monthNum}&year=${this.selectedYear}`;
    } else if (this.selectedReportType === 'rsmi') {
      endpoint = `http://localhost:5000/api/reports/monthly-rsmi?month=${monthNum}&year=${this.selectedYear}`;
    } else {
      this.generateSummaryReport();
      return;
    }

    this.http.get<any[]>(endpoint).subscribe({
      next: (data) => {
        if (this.selectedReportType === 'inventory') {
          this.generateInventoryPDF(data);
        } else {
          this.generateRSMIPDF(data);
        }
      },
      error: (err) => {
        this.isGenerating = false;
        console.error('Failed to fetch report data', err);
        alert('Failed to generate report. Ensure backend is running and you are logged in.');
      }
    });
  }

  // --- Core Processing Logic ---
  private processPdfOutput(pdfAsString: string, filename: string, category: string) {
    try {
      // 1. Convert Base64 Data URI to a local Blob
      // This bypasses Chrome's strict security rules against navigating to raw dataURIs via <a> tags.
      const byteString = atob(pdfAsString.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // 2. Trigger Safe Local Download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // 3. Post identical Base64 string to Database for Archive
      const reportNum = 'BSP-' + Math.floor(Math.random() * 10000);
      const userOffice = this.authService.currentUserValue?.office || 'HQ';
      
      const payload = {
        title: filename,
        report_number: `Report # ${reportNum}`,
        category: category,
        type: 'pdf',
        office: userOffice,
        file_data: pdfAsString
      };

      this.http.post('http://localhost:5000/api/reports/generated', payload).subscribe({
        next: () => {
          this.loadReports();
          this.isGenerating = false;
          this.closeGenerateModal();
        },
        error: (err) => {
          console.error('Failed to save report to database', err);
          this.isGenerating = false;
        }
      });
    } catch (err) {
      console.error('Error processing PDF output:', err);
      this.isGenerating = false;
      alert('An error occurred while saving the generated PDF.');
    }
  }

  private generateSummaryReport() {
    const issuanceSummary$ = this.http.get<any[]>('http://localhost:5000/api/reports/issuance-summary');
    const stockDist$ = this.http.get<any[]>('http://localhost:5000/api/reports/stock-distribution');
    
    forkJoin({ issuances: issuanceSummary$, stocks: stockDist$ }).subscribe({
      next: (res) => {
        this.generateSummaryPDF(res.issuances, res.stocks);
      },
      error: (err) => {
        this.isGenerating = false;
        console.error('Failed to fetch summary data', err);
      }
    });
  }

  private generateInventoryPDF(data: any[]) {
    if (!data || data.length === 0) {
      alert('No data found for the selected period.');
      this.isGenerating = false;
      return;
    }

    const element = document.createElement('div');
    element.className = 'report-print-container inventory-report';
    
    const monthNum = parseInt(this.monthMap[this.selectedMonth]);
    const yearNum = parseInt(this.selectedYear);
    const curEnd = new Date(yearNum, monthNum, 0);
    const curEndStr = `${this.selectedMonth.toUpperCase()} ${curEnd.getDate()}, ${yearNum}`;
    const prevEnd = new Date(yearNum, monthNum - 1, 0);
    const prevMonthName = this.monthNames[prevEnd.getMonth()].toUpperCase();
    const prevEndStr = `${prevMonthName} ${prevEnd.getDate()}, ${yearNum}`;

    const firstPageLimit = 20;
    const subsequentPageLimit = 25;
    const chunks: any[][] = [];
    chunks.push(data.slice(0, firstPageLimit));
    let remaining = data.slice(firstPageLimit);
    while (remaining.length > 0) {
      chunks.push(remaining.slice(0, subsequentPageLimit));
      remaining = remaining.slice(subsequentPageLimit);
    }

    let html = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .bsp-pdf-wrapper { 
          padding: 30px 40px; 
          background: white; 
          width: 1080px; 
          height: 750px; 
          font-family: 'Arial', sans-serif; 
          position: relative; 
          overflow: hidden;
        }
        .bsp-report-table { width: 1000px; border-collapse: collapse; font-size: 8.5px; table-layout: fixed; margin: 0 auto; }
        .bsp-report-table th, .bsp-report-table td { border: 1px solid black !important; padding: 4px 2px; overflow-wrap: break-word; word-break: break-word; background-clip: padding-box; }
        .bsp-report-table tr { height: 20px; }
        .bsp-report-table thead tr { background: #f2f2f2; font-weight: bold; height: auto; }
        .footer-section { position: absolute; bottom: 30px; left: 40px; right: 40px; display: flex; font-size: 11px; }
        .page-number { position: absolute; right: 40px; top: 30px; font-size: 10px; color: #666; }
      </style>
    `;

    const colGroup = `
      <colgroup>
        <col style="width: 50px;">
        <col style="width: 100px;">
        <col style="width: 170px;">
        <col style="width: 80px;">
        <col style="width: 45px;">
        <col style="width: 35px;">
        <col style="width: 35px;">
        <col style="width: 35px;">
        <col style="width: 60px;">
        <col style="width: 50px;">
        <col style="width: 35px;">
        <col style="width: 60px;">
        <col style="width: 50px;">
        <col style="width: 35px;">
        <col style="width: 60px;">
        <col style="width: 35px;">
        <col style="width: 65px;">
      </colgroup>
    `;

    let globalItemIndex = 0;

    chunks.forEach((chunk, pageIndex) => {
      const categoryRowSpans: { [key: number]: number } = {};
      let currentCat = '';
      let spanCount = 0;
      let firstIdx = 0;

      chunk.forEach((item, idx) => {
        if (item.category_name === currentCat) {
          spanCount++;
        } else {
          if (spanCount > 0) categoryRowSpans[firstIdx] = spanCount;
          currentCat = item.category_name;
          spanCount = 1;
          firstIdx = idx;
        }
      });
      if (spanCount > 0) categoryRowSpans[firstIdx] = spanCount;

      const pageBreakStyle = pageIndex < chunks.length - 1 ? 'page-break-after: always;' : '';
      html += `<div class="bsp-pdf-wrapper" style="${pageBreakStyle}">`;
      html += `<div class="page-number">Page ${pageIndex + 1} of ${chunks.length}</div>`;

      if (pageIndex === 0) {
        html += `
          <div style="text-align: center; margin-bottom: 15px; position: relative;">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="assets/img/bspLogo.png" style="height: 50px; margin-right: 15px;">
              <div style="text-align: left;">
                <div style="font-weight: bold; font-size: 14px;">BOY SCOUTS OF THE PHILIPPINES</div>
                <div style="font-size: 11px; font-weight: bold;">National Office, Manila</div>
                <div style="margin-top: 2px; font-weight: bold; font-size: 12px;">
                  INVENTORY REPORT AS OF ${curEndStr}
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        html += `<div style="height: 20px;"></div>`;
      }

      html += `<table class="bsp-report-table">${colGroup}`;

      if (pageIndex === 0) {
        html += `
          <thead>
            <tr style="text-align: center;">
              <th rowspan="2">ITEM NO</th>
              <th rowspan="2">ITEM CATEGORY</th>
              <th rowspan="2">ITEM NAME</th>
              <th colspan="4">DESCRIPTION</th>
              <th colspan="2">BEGINNING INVENTORY</th>
              <th colspan="3">NEW DELIVERY</th>
              <th rowspan="2">UNIT<br>COST</th>
              <th colspan="2">TOTAL ISSUANCES</th>
              <th colspan="2">ENDING INVENTORY</th>
            </tr>
            <tr style="text-align: center;">
              <th>SUPPLIER</th>
              <th>BRAND</th>
              <th>SIZE</th>
              <th>UNIT</th>
              <th>QTY</th>
              <th>AMOUNT</th>
              <th>DATE</th>
              <th>QTY</th>
              <th>AMOUNT</th>
              <th>QTY</th>
              <th>AMOUNT</th>
              <th>QTY</th>
              <th>AMOUNT</th>
            </tr>
          </thead>
        `;
      }
      
      html += `<tbody>`;

      chunk.forEach((item, idx) => {
        globalItemIndex++;
        const price = parseFloat(item.unit_price) || 0;
        html += `<tr><td style="text-align: center;">${globalItemIndex}</td>`;
        if (categoryRowSpans[idx]) {
          html += `<td rowspan="${categoryRowSpans[idx]}" style="vertical-align: middle; text-align: left; padding: 2px 4px;">${item.category_name || 'N/A'}</td>`;
        }
        html += `
            <td style="text-align: left;">${item.item_name}</td>
            <td style="text-align: center;">${item.supplier_name || '&nbsp;'}</td>
            <td style="text-align: center;">&nbsp;</td>
            <td style="text-align: center;">&nbsp;</td>
            <td style="text-align: center;">${item.unit_of_measure}</td>
            <td style="text-align: center;">${item.beginning_qty}</td>
            <td style="text-align: right;">${(item.beginning_qty * price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td style="text-align: center;">&nbsp;</td>
            <td style="text-align: center;">${item.total_in}</td>
            <td style="text-align: right;">${(item.total_in * price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td style="text-align: right;">${price.toFixed(2)}</td>
            <td style="text-align: center;">${item.total_out}</td>
            <td style="text-align: right;">${(item.total_out * price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td style="text-align: center;">${item.ending_qty}</td>
            <td style="text-align: right;">${(item.ending_qty * price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          </tr>
        `;
      });

      html += `</tbody></table>`;

      if (pageIndex === chunks.length - 1) {
        html += `
          <div class="footer-section">
            <div style="width: 300px;">
              <p style="text-align: left; margin-bottom: 25px;">Prepared by:</p>
              <div style="border-bottom: 1px solid black; font-weight: bold; text-align: center;">SERVILLANO J. BAJORA</div>
              <p style="text-align: center; margin-top: 3px;">Administrative Officer IV (Supply office)</p>
            </div>
            <div style="flex-grow: 1;"></div>
            <div style="width: 300px;">
              <p style="text-align: left; margin-bottom: 25px;">Noted by:</p>
              <div style="border-bottom: 1px solid black; font-weight: bold; text-align: center;">REYNANTE S. REYES</div>
              <p style="text-align: center; margin-top: 3px;">Admin Division Head</p>
            </div>
          </div>
        `;
      }
      html += `</div>`;
    });

    element.innerHTML = html;

    const opt = {
      margin: [0.2, 0.2, 0.2, 0.2] as [number, number, number, number],
      filename: `Inventory_Report_${this.selectedMonth}_${this.selectedYear}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, width: 1080, windowWidth: 1080, logging: false, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'landscape' as const },
      pagebreak: { mode: ['css'] as const }
    };

    html2pdf().set(opt).from(element).toPdf().output('datauristring').then((pdfAsString: string) => {
      this.processPdfOutput(pdfAsString, opt.filename, 'INVENTORY');
    }).catch((err: any) => {
      console.error('PDF Generation Error:', err);
      this.isGenerating = false;
      alert('An error occurred while generating the PDF.');
    });
  }

  private generateRSMIPDF(data: any[]) {
    if (!data || data.length === 0) {
      alert('No data found for the selected period.');
      this.isGenerating = false;
      return;
    }

    const element = document.createElement('div');
    const monthNum = parseInt(this.monthMap[this.selectedMonth]);
    const yearNum = parseInt(this.selectedYear);
    const curEnd = new Date(yearNum, monthNum, 0);
    const curEndStr = `${curEnd.getDate()}-${this.selectedMonth}-${yearNum}`;

    const firstPageLimit = 15;
    const subsequentPageLimit = 20;
    const chunks: any[][] = [];
    chunks.push(data.slice(0, firstPageLimit));
    let remaining = data.slice(firstPageLimit);
    while (remaining.length > 0) {
      chunks.push(remaining.slice(0, subsequentPageLimit));
      remaining = remaining.slice(subsequentPageLimit);
    }

    let grandTotal = 0;
    data.forEach(item => grandTotal += parseFloat(item.total_cost) || 0);

    let html = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .bsp-pdf-wrapper { 
          padding: 30px 40px; 
          background: white; 
          width: 1080px; 
          height: 750px; 
          font-family: 'Arial', sans-serif; 
          position: relative; 
          overflow: hidden;
        }
        .rsmi-table { width: 1000px; border-collapse: collapse; font-size: 10px; table-layout: fixed; margin: 0 auto; }
        .rsmi-table th, .rsmi-table td { border: 1px solid black; padding: 6px; word-wrap: break-word; overflow: hidden; }
        .rsmi-table tr { height: 25px; }
        .rsmi-table thead tr { background: #f2f2f2; font-weight: bold; height: auto; }
        .footer-section { position: absolute; bottom: 30px; left: 40px; right: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 100px; font-size: 11px; }
        .page-number { position: absolute; right: 40px; top: 30px; font-size: 10px; color: #666; }
      </style>
    `;

    chunks.forEach((chunk, pageIndex) => {
      const pageBreakStyle = pageIndex < chunks.length - 1 ? 'page-break-after: always;' : '';
      html += `<div class="bsp-pdf-wrapper" style="${pageBreakStyle}">`;
      html += `<div class="page-number">Page ${pageIndex + 1} of ${chunks.length}</div>`;

      if (pageIndex === 0) {
        html += `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
             <div style="text-align: left; display: flex; align-items: center; gap: 15px;">
                <img src="assets/img/bspLogo.png" style="height: 60px;">
                <div>
                  <div style="font-weight: bold; font-size: 14px;">BOY SCOUTS OF THE PHILIPPINES</div>
                  <div style="font-size: 12px;">National Office, Manila</div>
                </div>
             </div>
             <div style="font-weight: bold; font-size: 12px; font-style: italic;">Appendix 64</div>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <div style="font-weight: bold; font-size: 18px;">REPORT OF SUPPLIES AND MATERIALS ISSUED (RSMI)</div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; font-size: 12px;">
             <div style="display: flex; flex-direction: column; gap: 5px;">
                <div><span style="font-weight: bold;">Entity Name:</span> BOY SCOUTS OF THE PHILIPPINES</div>
                <div><span style="font-weight: bold;">Fund Cluster:</span> SUPPLY UNIT/ADMIN</div>
             </div>
             <div style="display: flex; flex-direction: column; gap: 5px; text-align: right;">
                <div><span style="font-weight: bold;">Serial No.:</span> </div>
                <div><span style="font-weight: bold;">Date:</span> ${curEndStr}</div>
             </div>
          </div>
        `;
      } else {
        html += `<div style="height: 30px;"></div>`;
      }

      html += `
        <table class="rsmi-table">
          <colgroup>
            <col style="width: 100px;">
            <col style="width: 150px;">
            <col style="width: 100px;">
            <col style="width: 270px;">
            <col style="width: 60px;">
            <col style="width: 80px;">
            <col style="width: 110px;">
            <col style="width: 130px;">
          </colgroup>
      `;

      if (pageIndex === 0) {
        html += `
          <thead>
            <tr>
              <th colspan="6" style="font-weight: normal; font-style: italic; background: #f9f9f9; text-align: center;">To be filled up by the Supply and or Property Division/Unit</th>
              <th colspan="2" style="font-weight: normal; font-style: italic; background: #f9f9f9; text-align: center;">To be filled up by the Accounting Division/Unit</th>
            </tr>
            <tr style="background: #f0f0f0; text-align: center;">
              <th>RIS No.</th>
              <th>Responsibility Center Code</th>
              <th>Stock No.</th>
              <th>Item</th>
              <th>Unit</th>
              <th>Quantity</th>
              <th>Unit Cost</th>
              <th>Amount</th>
            </tr>
          </thead>
        `;
      }

      html += `<tbody>`;
      chunk.forEach(item => {
        html += `
          <tr>
            <td style="text-align: center;">${item.ris_no || ''}</td>
            <td style="text-align: center;">${item.office_name || 'N/A'}</td>
            <td>${item.item_code || ''}</td>
            <td>${item.item_name}</td>
            <td style="text-align: center;">${item.unit_of_measure}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${parseFloat(item.unit_cost).toFixed(2)}</td>
            <td style="text-align: right;">${parseFloat(item.total_cost).toFixed(2)}</td>
          </tr>
        `;
      });

      if (pageIndex === chunks.length - 1) {
        html += `
          <tr style="font-weight: bold;">
            <td colspan="7" style="text-align: right;">GRAND TOTAL</td>
            <td style="text-align: right;">${grandTotal.toFixed(2)}</td>
          </tr>
        `;
      }
      html += `</tbody></table>`;

      if (pageIndex === chunks.length - 1) {
        html += `
          <div class="footer-section">
            <div style="text-align: left;">
              <p>I hereby certify to the correctness of the above information.</p>
              <div style="margin-top: 40px; border-bottom: 1px solid black; font-weight: bold; text-align: center;">SERVILLANO J. BAJORA</div>
              <p style="text-align: center; margin-top: 5px;">Administrative Officer IV (Supply office)</p>
            </div>
            <div style="text-align: left;">
              <p>Approved by:</p>
              <div style="margin-top: 40px; border-bottom: 1px solid black; font-weight: bold; text-align: center;">REYNANTE S. REYES</div>
              <p style="text-align: center; margin-top: 5px;">Admin Division Head</p>
            </div>
          </div>
        `;
      }
      html += `</div>`;
    });

    element.innerHTML = html;

    const opt = {
      margin: [0.2, 0.2, 0.2, 0.2] as [number, number, number, number],
      filename: `RSMI_Report_${this.selectedMonth}_${this.selectedYear}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, width: 1080, windowWidth: 1080, logging: false, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'landscape' as const },
      pagebreak: { mode: ['css'] as const }
    };

    html2pdf().set(opt).from(element).toPdf().output('datauristring').then((pdfAsString: string) => {
      this.processPdfOutput(pdfAsString, opt.filename, 'RSMI');
    }).catch((err: any) => {
      console.error('PDF Generation Error:', err);
      this.isGenerating = false;
      alert('An error occurred while generating the PDF.');
    });
  }

  private generateSummaryPDF(issuances: any[], stocks: any[]) {
    const element = document.createElement('div');
    
    let issHtml = '';
    issuances.forEach(iss => {
      issHtml += `<tr><td style="border: 1px solid black; padding: 5px;">${iss.office}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${iss.total_requests}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${iss.total_issued}</td></tr>`;
    });

    let stockHtml = '';
    stocks.forEach(s => {
      stockHtml += `<tr><td style="border: 1px solid black; padding: 5px;">${s.category}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${s.total_items}</td><td style="border: 1px solid black; padding: 5px; text-align: center;">${s.total_stock}</td></tr>`;
    });

    element.innerHTML = this.getReportHeader('IPMS SYSTEM SUMMARY REPORT', `GENERATED ON ${new Date().toLocaleDateString()}`) + `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
          <div>
            <h4 style="margin: 0 0 10px 0; color: #1a7a3e;">Issuance Summary by Office</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead><tr style="background: #f0f0f0;"><th style="border: 1px solid black; padding: 5px;">Office</th><th style="border: 1px solid black; padding: 5px;">Reqs</th><th style="border: 1px solid black; padding: 5px;">Issued</th></tr></thead>
              <tbody>${issHtml}</tbody>
            </table>
          </div>
          <div>
            <h4 style="margin: 0 0 10px 0; color: #1a7a3e;">Stock Distribution by Category</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead><tr style="background: #f0f0f0;"><th style="border: 1px solid black; padding: 5px;">Category</th><th style="border: 1px solid black; padding: 5px;">Items</th><th style="border: 1px solid black; padding: 5px;">Stock</th></tr></thead>
              <tbody>${stockHtml}</tbody>
            </table>
          </div>
        </div>
        ${this.getReportFooter()}
      </div>
    `;

    this.savePDF(element, `System_Summary_${this.selectedMonth}_${this.selectedYear}.pdf`, 'portrait');
  }

  private getReportHeader(title: string, subtitle: string) {
    return `
      <div style="padding: 30px; font-family: 'Arial', sans-serif; background: white;">
        <div style="text-align: center; margin-bottom: 15px;">
          <img src="assets/img/bspLogo.png" style="height: 50px; margin-bottom: 5px;">
          <div style="font-weight: bold; font-size: 14px;">BOY SCOUTS OF THE PHILIPPINES</div>
          <div style="font-size: 11px;">National Office, Manila</div>
          <div style="margin-top: 15px; font-weight: bold; font-size: 16px; border-bottom: 2px solid #1a7a3e; display: inline-block; padding-bottom: 3px;">${title}</div>
          <div style="font-size: 12px; margin-top: 5px;">${subtitle}</div>
        </div>
    `;
  }

  private getReportFooter() {
    return `
      <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px;">
        <div style="width: 200px; text-align: center;">
          <p style="margin-bottom: 30px;">Prepared by:</p>
          <div style="border-bottom: 1px solid black; font-weight: bold;">SERVILLANO J. BAJORA</div>
          <p style="margin-top: 3px;">Supply Officer</p>
        </div>
        <div style="width: 200px; text-align: center;">
          <p style="margin-bottom: 30px;">Noted by:</p>
          <div style="border-bottom: 1px solid black; font-weight: bold;">REYNANTE S. REYES</div>
          <p style="margin-top: 3px;">Admin Division Head</p>
        </div>
      </div>
      <div style="margin-top: 30px; font-size: 9px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
        BSP Inventory & Property Management System | System Generated
      </div>
    `;
  }

  private savePDF(element: HTMLElement, filename: string, orientation: 'portrait' | 'landscape') {
    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: orientation }
    };

    html2pdf().set(opt).from(element).toPdf().output('datauristring').then((pdfAsString: string) => {
      this.processPdfOutput(pdfAsString, filename, this.selectedReportType.toUpperCase());
    }).catch((err: any) => {
      console.error('PDF Generation Error:', err);
      this.isGenerating = false;
      alert('An error occurred while generating the PDF.');
    });
  }
}