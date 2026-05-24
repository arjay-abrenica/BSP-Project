import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

// Native PDF Libraries
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, OnDestroy {

  constructor(
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) { }

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

  // Dynamic Blob Preview Properties
  private currentBlobUrl: string | null = null;
  safeBlobUrl: SafeResourceUrl | null = null;

  // Pagination Properties
  currentPage: number = 1;
  pageSize: number = 6;

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

  // Pagination Accessors
  get totalPages(): number {
    return Math.ceil(this.filteredReports.length / this.pageSize) || 1;
  }

  get totalPagesArray(): number[] {
    const total = this.totalPages;
    const arr = [];
    for (let i = 1; i <= total; i++) {
      arr.push(i);
    }
    return arr;
  }

  get paginatedReports(): ReportItem[] {
    const total = this.totalPages;
    if (this.currentPage > total) {
      this.currentPage = 1;
    }
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredReports.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  selectReport(report: ReportItem) {
    this.selectedReport = report;
    this.safeBlobUrl = null;

    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    if (!report.fileData) {
      this.http.get<{ fileData: string }>(`http://localhost:5000/api/reports/generated/${report.id}`).subscribe({
        next: (res) => {
          report.fileData = res.fileData;
          if (this.selectedReport?.id === report.id) {
            this.createSafeBlobUrl(res.fileData);
          }
        },
        error: (err) => console.error('Failed to load report file data', err)
      });
    } else {
      this.createSafeBlobUrl(report.fileData);
    }
  }

  private createSafeBlobUrl(dataUri: string) {
    try {
      const blob = this.dataURIToBlob(dataUri);
      this.currentBlobUrl = URL.createObjectURL(blob);
      this.safeBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentBlobUrl);
    } catch (e) {
      console.error('Failed to create blob URL', e);
      this.safeBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(dataUri);
    }
  }

  private dataURIToBlob(dataURI: string): Blob {
    const parts = dataURI.split(',');
    const byteString = atob(parts[1]);
    const mimeString = parts[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  ngOnDestroy() {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
    }
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
        if (!data || data.length === 0) {
          alert('No data found for the selected period.');
          this.isGenerating = false;
          return;
        }

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
  private archiveReport(pdfDataUri: string, filename: string, category: string) {
    const reportNum = 'BSP-' + Math.floor(Math.random() * 10000);
    const userOffice = this.authService.currentUserValue?.office || 'HQ';

    const payload = {
      title: filename,
      report_number: `Report # ${reportNum}`,
      category: category,
      type: 'pdf',
      office: userOffice,
      file_data: pdfDataUri
    };

    this.http.post('http://localhost:5000/api/reports/generated', payload).subscribe({
      next: () => {
        this.loadReports();
        this.isGenerating = false;
        this.closeGenerateModal();
        alert('Report generated and saved to archive successfully.');
      },
      error: (err) => {
        console.error('Failed to save report to database', err);
        this.isGenerating = false;
        alert('Report generated but failed to save to archive.');
      }
    });
  }

  downloadReport(report: ReportItem) {
    if (!report.fileData) return;
    const link = document.createElement('a');
    link.href = report.fileData;
    link.download = report.title;
    link.click();
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

  // Utility to load image and return base64
  private async getLogoBase64(): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = 'assets/img/bspLogo.png';
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (err) => {
        console.error('Failed to load logo', err);
        reject(err);
      };
    });
  }

  // --- Native PDF Generation with jsPDF & autoTable ---

  private async generateInventoryPDF(data: any[]) {
    const doc = new jsPDF('landscape', 'pt', 'a4');
    const filename = `Inventory_Report_${this.selectedMonth}_${this.selectedYear}.pdf`;

    const monthNum = parseInt(this.monthMap[this.selectedMonth]);
    const yearNum = parseInt(this.selectedYear);
    const curEnd = new Date(yearNum, monthNum, 0);
    const curEndStr = `${this.selectedMonth.toUpperCase()} ${curEnd.getDate()}, ${yearNum}`;

    let logoData = '';
    try {
      logoData = await this.getLogoBase64();
    } catch (e) { }

    const addHeader = (data: any) => {
      if (logoData) {
        doc.addImage(logoData, 'PNG', 40, 25, 45, 45);
      }
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('BOY SCOUTS OF THE PHILIPPINES', doc.internal.pageSize.width / 2, 40, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('National Office, Manila', doc.internal.pageSize.width / 2, 53, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`INVENTORY REPORT AS OF ${curEndStr}`, doc.internal.pageSize.width / 2, 73, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width - 80, 40);
    };

    const tableData = data.map((item, index) => {
      const price = parseFloat(item.unit_price) || 0;
      return [
        index + 1,
        item.category_name || '',
        item.item_name || '',
        item.supplier_name || '',
        '', // Brand
        '', // Size
        item.unit_of_measure || '',
        item.beginning_qty || 0,
        (item.beginning_qty * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        '', // New Date
        item.total_in || 0,
        (item.total_in * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        item.total_out || 0,
        (item.total_out * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        item.ending_qty || 0,
        (item.ending_qty * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ];
    });

    autoTable(doc, {
      startY: 95,
      head: [
        [
          { content: 'ITEM NO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'ITEM CATEGORY', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'ITEM NAME', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'DESCRIPTION', colSpan: 4, styles: { halign: 'center' } },
          { content: 'BEGINNING INVENTORY', colSpan: 2, styles: { halign: 'center' } },
          { content: 'NEW DELIVERY', colSpan: 3, styles: { halign: 'center' } },
          { content: 'UNIT COST', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'TOTAL ISSUANCES', colSpan: 2, styles: { halign: 'center' } },
          { content: 'ENDING INVENTORY', colSpan: 2, styles: { halign: 'center' } }
        ],
        [
          'SUPPLIER', 'BRAND', 'SIZE', 'UNIT',
          'QTY', 'AMOUNT', 'DATE', 'QTY', 'AMOUNT',
          'QTY', 'AMOUNT', 'QTY', 'AMOUNT'
        ]
      ],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 6.5,
        cellPadding: 3,
        overflow: 'linebreak',
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        textColor: [0, 0, 0],
        valign: 'middle'
      },
      headStyles: {
        fillColor: [250, 245, 245],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' }, // ITEM NO
        1: { cellWidth: 65 }, // CATEGORY
        2: { cellWidth: 150 }, // NAME
        3: { cellWidth: 55 }, // SUPPLIER
        4: { cellWidth: 32 }, // BRAND
        5: { cellWidth: 32 }, // SIZE
        6: { cellWidth: 28 }, // UNIT
        7: { cellWidth: 32, halign: 'center' }, // BEG QTY
        8: { cellWidth: 48, halign: 'right' }, // BEG AMT
        9: { cellWidth: 38 }, // NEW DATE
        10: { cellWidth: 32, halign: 'center' }, // NEW QTY
        11: { cellWidth: 48, halign: 'right' }, // NEW AMT
        12: { cellWidth: 42, halign: 'right' }, // UNIT COST
        13: { cellWidth: 32, halign: 'center' }, // ISS QTY
        14: { cellWidth: 48, halign: 'right' }, // ISS AMT
        15: { cellWidth: 32, halign: 'center' }, // END QTY
        16: { cellWidth: 48, halign: 'right' }  // END AMT
      },
      didDrawPage: (data: any) => {
        addHeader(data);
      },
      margin: { top: 95, bottom: 60, left: 20, right: 20 }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    if (finalY > doc.internal.pageSize.height - 100) { doc.addPage(); }

    const footerY = doc.internal.pageSize.height - 60;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Prepared by:', 20, footerY - 20);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVILLANO J. BAJORA', 20, footerY);
    doc.line(20, footerY + 2, 170, footerY + 2);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Administrative Officer IV (Supply office)', 20, footerY + 12);

    doc.setFontSize(9);
    doc.text('Noted by:', doc.internal.pageSize.width - 170, footerY - 20);
    doc.setFont('helvetica', 'bold');
    doc.text('REYNANTE S. REYES', doc.internal.pageSize.width - 170, footerY);
    doc.line(doc.internal.pageSize.width - 170, footerY + 2, doc.internal.pageSize.width - 20, footerY + 2);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Admin Division Head', doc.internal.pageSize.width - 170, footerY + 12);

    this.archiveReport(doc.output('datauristring'), filename, 'INVENTORY');
  }


  private async generateRSMIPDF(data: any[]) {
    const doc = new jsPDF('landscape', 'pt', 'a4');
    const filename = `RSMI_Report_${this.selectedMonth}_${this.selectedYear}.pdf`;

    const monthNum = parseInt(this.monthMap[this.selectedMonth]);
    const yearNum = parseInt(this.selectedYear);
    const curEnd = new Date(yearNum, monthNum, 0);
    const curEndStr = `${curEnd.getDate()}-${this.selectedMonth}-${yearNum}`;

    let logoData = '';
    try {
      logoData = await this.getLogoBase64();
    } catch (e) { }

    let grandTotal = 0;
    const tableData = data.map(item => {
      grandTotal += parseFloat(item.total_cost) || 0;
      return [
        item.ris_no || '',
        item.office_name || 'N/A',
        item.item_code || '',
        item.item_name || '',
        item.unit_of_measure || '',
        item.quantity || 0,
        parseFloat(item.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        parseFloat(item.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })
      ];
    });

    autoTable(doc, {
      startY: 120,
      head: [
        [
          { content: 'To be filled up by the Supply and or Property Division/Unit', colSpan: 6, styles: { halign: 'center', fontStyle: 'italic' } },
          { content: 'To be filled up by the Accounting Division/Unit', colSpan: 2, styles: { halign: 'center', fontStyle: 'italic' } }
        ],
        ['RIS No.', 'Responsibility Center Code', 'Stock No.', 'Item', 'Unit', 'Quantity', 'Unit Cost', 'Amount']
      ],
      body: [
        ...tableData,
        [{ content: 'GRAND TOTAL', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } }, { content: grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }]
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 4, lineColor: [0, 0, 0], lineWidth: 0.2 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      didDrawPage: (data: any) => {
        if (logoData) {
          doc.addImage(logoData, 'PNG', 40, 30, 50, 50);
        }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('BOY SCOUTS OF THE PHILIPPINES', 100, 45);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('National Office, Manila', 100, 58);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORT OF SUPPLIES AND MATERIALS ISSUED (RSMI)', doc.internal.pageSize.width / 2, 90, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Date: ${curEndStr}`, doc.internal.pageSize.width - 150, 110);
        doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width - 70, 45);
      }
    });

    const pdfDataUri = doc.output('datauristring');
    this.archiveReport(pdfDataUri, filename, 'RSMI');
  }

  private async generateSummaryPDF(issuances: any[], stocks: any[]) {
    const doc = new jsPDF('portrait', 'pt', 'a4');
    const filename = `System_Summary_${this.selectedMonth}_${this.selectedYear}.pdf`;

    let logoData = '';
    try {
      logoData = await this.getLogoBase64();
    } catch (e) { }

    if (logoData) {
      doc.addImage(logoData, 'PNG', 40, 30, 50, 50);
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BOY SCOUTS OF THE PHILIPPINES', doc.internal.pageSize.width / 2, 45, { align: 'center' });
    doc.setFontSize(16);
    doc.text('IPMS SYSTEM SUMMARY REPORT', doc.internal.pageSize.width / 2, 75, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width / 2, 90, { align: 'center' });

    autoTable(doc, {
      startY: 120,
      head: [['Office', 'Total Requests', 'Total Issued']],
      body: issuances.map(iss => [iss.office, iss.total_requests, iss.total_issued]),
      theme: 'grid',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
      margin: { left: 40, right: 300 }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Category', 'Total Items', 'Total Stock']],
      body: stocks.map(s => [s.category, s.total_items, s.total_stock]),
      theme: 'grid',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
      margin: { left: 300, right: 40 }
    });

    const pdfDataUri = doc.output('datauristring');
    this.archiveReport(pdfDataUri, filename, 'SUMMARY');
  }
}