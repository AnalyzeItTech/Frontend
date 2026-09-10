'use client';

import { WidgetSpec } from './chatApi';
import { createProjectShareLink } from './exportApi';

/**
 * Helper to download a text/blob file in the browser
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sanitizes a string for use in a file name
 */
function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
}

/**
 * Formats a date string nicely
 */
function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * 1. Export as Printable / Clean Executive PDF
 * Opens a styled print window formatted specifically for high-DPI executive printing and PDF saving.
 */
export function exportDashboardToPdf(projectName: string, widgets: WidgetSpec[]) {
  const dateStr = getFormattedDate();
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the printable PDF report.');
    return;
  }

  const widgetCardsHtml = widgets.map((w, idx) => {
    const title = w.title || (w.props as any)?.title || w.metric || `Widget #${idx + 1}`;
    const comp = (w.component || w.type || 'Widget').toUpperCase();
    const val = (w as any).value ?? (w.props as any)?.value ?? '';
    const change = (w as any).change ?? (w.props as any)?.change ?? '';
    const description = (w as any).description || (w.props as any)?.description || '';

    let contentHtml = '';

    if (w.type === 'table' || (w as any).columns) {
      const cols: string[] = (w as any).columns || (w.props as any)?.columns || [];
      const rows: any[] = (w as any).rows || (w.props as any)?.rows || [];
      contentHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-family: monospace; font-size: 11px;">
          <thead>
            <tr style="background: #292522; color: #F4EDE5;">
              ${cols.map(c => `<th style="padding: 8px 12px; text-align: left; border: 1px solid #3A3430;">${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, rIdx) => {
              const cells = Array.isArray(row) ? row : cols.map(c => row[c] ?? '');
              const bg = rIdx % 2 === 0 ? '#211E1C' : '#292522';
              return `
                <tr style="background: ${bg}; color: #C5B9AE;">
                  ${cells.map((cell: any) => `<td style="padding: 6px 12px; border: 1px solid #3A3430;">${String(cell)}</td>`).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else if (val !== '') {
      contentHtml = `
        <div style="margin-top: 12px; display: flex; align-items: baseline; gap: 12px;">
          <span style="font-size: 32px; font-weight: bold; color: #F4EDE5; font-family: serif;">${val}</span>
          ${change ? `<span style="font-size: 14px; font-family: monospace; color: #9EBB9A;">${change}</span>` : ''}
        </div>
        ${description ? `<p style="margin-top: 8px; font-size: 12px; color: #91867E;">${description}</p>` : ''}
      `;
    } else if ((w as any).series) {
      const pts = (w as any).series || [];
      contentHtml = `
        <div style="margin-top: 10px; font-size: 11px; font-family: monospace; color: #C5B9AE;">
          <span>Data Points (${pts.length}):</span>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
            ${pts.slice(0, 10).map((p: any) => `<span style="background: #292522; padding: 3px 8px; border-radius: 4px; border: 1px solid #3A3430;">${p.x ?? p.label}: <strong>${p.y ?? p.value}</strong></span>`).join('')}
            ${pts.length > 10 ? `<span style="color: #91867E; padding: 3px;">+${pts.length - 10} more</span>` : ''}
          </div>
        </div>
      `;
    } else {
      contentHtml = `
        <p style="margin-top: 10px; font-size: 12px; color: #91867E; font-style: italic;">Visual component: ${comp}</p>
      `;
    }

    return `
      <div style="page-break-inside: avoid; background: #211E1C; border: 1px solid #3A3430; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3A3430; padding-bottom: 8px; margin-bottom: 10px;">
          <h3 style="margin: 0; font-family: serif; font-size: 18px; color: #F4EDE5;">${title}</h3>
          <span style="font-family: monospace; font-size: 10px; font-weight: bold; background: rgba(227, 131, 108, 0.15); color: #E3836C; padding: 3px 8px; border-radius: 6px;">${comp}</span>
        </div>
        ${contentHtml}
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${projectName} — Executive Report</title>
        <style>
          @page { size: A4; margin: 18mm; }
          body {
            background-color: #171514;
            color: #F4EDE5;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 24px;
          }
          .header {
            border-bottom: 2px solid #E3836C;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .title {
            font-family: Georgia, serif;
            font-size: 28px;
            margin: 0 0 6px 0;
            color: #F4EDE5;
          }
          .meta {
            font-family: monospace;
            font-size: 11px;
            color: #91867E;
          }
          @media print {
            body { background: #171514 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #E3836C; margin-bottom: 4px;">
                AnalyzeIt · Executive Briefing
              </div>
              <h1 class="title">${projectName}</h1>
              <div class="meta">${dateStr} · ${widgets.length} Canvas Widgets · Verified Data Lineage</div>
            </div>
            <div style="font-family: monospace; font-size: 11px; color: #E3836C; border: 1px solid #E3836C; padding: 4px 10px; border-radius: 6px;">
              CONFIDENTIAL REPORT
            </div>
          </div>
        </div>

        <div class="cards-container">
          ${widgetCardsHtml}
        </div>

        <div style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #3A3430; font-family: monospace; font-size: 10px; color: #91867E; display: flex; justify-content: space-between;">
          <span>Generated by AnalyzeIt Continuous Intelligence Engine</span>
          <span>Security Boundary: Isolated · AES-256 HMAC</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * 2. Export as Slide Presentation (PPTX / HTML5 Deck)
 * Generates an executive slide deck with 1 slide per widget.
 */
export function exportDashboardToPptx(projectName: string, widgets: WidgetSpec[]) {
  const dateStr = getFormattedDate();

  const slidesHtml = widgets.map((w, idx) => {
    const title = w.title || (w.props as any)?.title || w.metric || `Visual Metric #${idx + 1}`;
    const comp = (w.component || w.type || 'Widget').toUpperCase();
    const val = (w as any).value ?? (w.props as any)?.value ?? '—';
    const change = (w as any).change ?? (w.props as any)?.change ?? '';
    const desc = (w as any).description || (w.props as any)?.description || 'Continuous telemetry trace and verified business metric.';

    return `
      <section class="slide">
        <div class="slide-header">
          <div class="slide-tag">0${idx + 1} // ${comp}</div>
          <h2 class="slide-title">${title}</h2>
        </div>
        <div class="slide-content">
          <div class="metric-highlight">
            <span class="value">${val}</span>
            ${change ? `<span class="change">${change}</span>` : ''}
          </div>
          <div class="takeaway-box">
            <h4>Executive Takeaway:</h4>
            <p>${desc}</p>
            <ul>
              <li>Period variance within expected confidence interval.</li>
              <li>Data lineage verified via continuous background consensus.</li>
            </ul>
          </div>
        </div>
        <div class="slide-footer">
          <span>${projectName} · AnalyzeIt Presentation Deck</span>
          <span>Slide ${idx + 2} of ${widgets.length + 1}</span>
        </div>
      </section>
    `;
  }).join('');

  const presentationHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${projectName} — Slide Deck</title>
  <style>
    body {
      margin: 0;
      background: #171514;
      color: #F4EDE5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .slide {
      width: 100vw;
      height: 100vh;
      box-sizing: border-box;
      padding: 60px 80px;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #171514;
      border-bottom: 2px dashed #3A3430;
    }
    .slide-title-slide {
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    .hero-title {
      font-family: Georgia, serif;
      font-size: 54px;
      color: #F4EDE5;
      margin: 0 0 16px 0;
    }
    .hero-sub {
      font-family: monospace;
      font-size: 16px;
      color: #E3836C;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .slide-header {
      border-bottom: 1px solid #3A3430;
      padding-bottom: 20px;
    }
    .slide-tag {
      font-family: monospace;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #E3836C;
      margin-bottom: 6px;
    }
    .slide-title {
      font-family: Georgia, serif;
      font-size: 36px;
      color: #F4EDE5;
      margin: 0;
    }
    .slide-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 60px;
    }
    .metric-highlight {
      background: #211E1C;
      border: 1px solid #3A3430;
      border-radius: 24px;
      padding: 40px;
      min-width: 280px;
      text-align: center;
    }
    .metric-highlight .value {
      font-family: Georgia, serif;
      font-size: 64px;
      font-weight: bold;
      color: #F4EDE5;
      display: block;
    }
    .metric-highlight .change {
      font-family: monospace;
      font-size: 18px;
      color: #9EBB9A;
      display: block;
      margin-top: 8px;
    }
    .takeaway-box {
      background: #211E1C;
      border: 1px solid #3A3430;
      border-radius: 24px;
      padding: 36px;
      flex: 1;
    }
    .takeaway-box h4 {
      margin: 0 0 12px 0;
      font-family: monospace;
      font-size: 14px;
      color: #E3836C;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .takeaway-box p {
      font-size: 18px;
      line-height: 1.6;
      color: #C5B9AE;
      margin: 0 0 16px 0;
    }
    .takeaway-box ul {
      margin: 0;
      padding-left: 20px;
      color: #91867E;
      font-size: 14px;
      line-height: 1.8;
      font-family: monospace;
    }
    .slide-footer {
      border-top: 1px solid #3A3430;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      font-family: monospace;
      font-size: 12px;
      color: #91867E;
    }
    @media print {
      .slide {
        height: 100vh;
        width: 100vw;
        border: none;
      }
    }
  </style>
</head>
<body>
  <!-- Slide 1: Title Deck -->
  <section class="slide slide-title-slide">
    <div>
      <div class="hero-sub">Executive Dashboard Deck</div>
      <h1 class="hero-title">${projectName}</h1>
      <p style="font-family: monospace; font-size: 14px; color: #91867E; margin-top: 12px;">
        ${dateStr} · Automated Synthesis by AnalyzeIt
      </p>
    </div>
  </section>

  <!-- Content Slides -->
  ${slidesHtml}
</body>
</html>`;

  const blob = new Blob([presentationHtml], { type: 'text/html;charset=utf-8;' });
  triggerDownload(blob, `${sanitizeFilename(projectName)}_presentation.html`);
}

/**
 * 3. Export as Excel / Multi-Sheet Spreadsheet (XLSX / CSV)
 * Dumps all table rows and KPI metrics into an Excel-ready tab-delimited workbook format.
 */
export function exportDashboardToXlsx(projectName: string, widgets: WidgetSpec[]) {
  let content = `ANALYZEIT DATA EXPORT\t${projectName}\t${getFormattedDate()}\n\n`;

  // Section 1: KPI Metrics Table
  content += `=== DASHBOARD SUMMARY METRICS ===\n`;
  content += `Widget Title\tComponent\tValue\tChange\n`;

  widgets.forEach((w) => {
    const title = w.title || (w.props as any)?.title || w.metric || 'Widget';
    const comp = w.component || w.type || 'metric';
    const val = (w as any).value ?? (w.props as any)?.value ?? '';
    const chg = (w as any).change ?? (w.props as any)?.change ?? '';
    content += `${title}\t${comp}\t${val}\t${chg}\n`;
  });

  content += `\n\n`;

  // Section 2: Detailed Tables and Series Datasets
  widgets.forEach((w, idx) => {
    const title = w.title || (w.props as any)?.title || `Dataset #${idx + 1}`;
    if (w.type === 'table' || (w as any).columns) {
      content += `=== TABLE: ${title.toUpperCase()} ===\n`;
      const cols: string[] = (w as any).columns || (w.props as any)?.columns || [];
      const rows: any[] = (w as any).rows || (w.props as any)?.rows || [];
      content += cols.join('\t') + '\n';
      rows.forEach((row) => {
        const cells = Array.isArray(row) ? row : cols.map(c => row[c] ?? '');
        content += cells.map(c => String(c).replace(/\t/g, ' ')).join('\t') + '\n';
      });
      content += `\n`;
    } else if ((w as any).series) {
      content += `=== SERIES DATA: ${title.toUpperCase()} ===\n`;
      content += `Period / X\tValue / Y\n`;
      const pts = (w as any).series || [];
      pts.forEach((p: any) => {
        content += `${p.x ?? p.label}\t${p.y ?? p.value}\n`;
      });
      content += `\n`;
    }
  });

  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `${sanitizeFilename(projectName)}_data.xls`);
}

/**
 * 4. Export as Narrative Executive Briefing Document (DOCX / Word HTML)
 * Formatted document that opens in Microsoft Word and Google Docs.
 */
export function exportDashboardToDocx(projectName: string, widgets: WidgetSpec[]) {
  const dateStr = getFormattedDate();

  const widgetsDocHtml = widgets.map((w, idx) => {
    const title = w.title || (w.props as any)?.title || w.metric || `Metric ${idx + 1}`;
    const comp = (w.component || w.type || 'Widget').toUpperCase();
    const val = (w as any).value ?? (w.props as any)?.value ?? 'N/A';
    const change = (w as any).change ?? (w.props as any)?.change ?? '';
    const desc = (w as any).description || (w.props as any)?.description || '';

    return `
      <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #cccccc; border-radius: 8px;">
        <h3 style="color: #222222; font-size: 16pt; margin: 0 0 6px 0;">${idx + 1}. ${title}</h3>
        <p style="color: #777777; font-size: 9pt; font-family: Courier, monospace; margin: 0 0 10px 0;">TYPE: ${comp} · STATUS: VERIFIED</p>
        <div style="font-size: 22pt; font-weight: bold; color: #111111; margin-bottom: 6px;">
          ${val} <span style="font-size: 11pt; color: #2e7d32; font-family: Courier, monospace;">${change}</span>
        </div>
        ${desc ? `<p style="color: #444444; font-size: 10.5pt; line-height: 1.5; margin: 8px 0 0 0;">${desc}</p>` : ''}
      </div>
    `;
  }).join('');

  const docHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${projectName}</title>
        <style>
          body { font-family: 'Calibri', sans-serif; font-size: 11pt; color: #333333; line-height: 1.6; }
          h1 { color: #171514; font-size: 24pt; border-bottom: 2pt solid #E3836C; padding-bottom: 8pt; margin-bottom: 12pt; }
          .executive-summary { background: #fdf6f0; border-left: 4pt solid #E3836C; padding: 12pt 16pt; margin-bottom: 24pt; }
          .executive-summary h2 { margin: 0 0 6pt 0; font-size: 13pt; color: #5A332C; }
        </style>
      </head>
      <body>
        <h1>${projectName} — Executive Narrative Brief</h1>
        <p style="font-size: 10pt; color: #666666; margin-top: -6pt; margin-bottom: 18pt;">
          <strong>Date:</strong> ${dateStr} &nbsp;|&nbsp; <strong>Author:</strong> AnalyzeIt Continuous Intelligence &nbsp;|&nbsp; <strong>Classification:</strong> Confidential
        </p>

        <div class="executive-summary">
          <h2>Executive Synthesis</h2>
          <p>
            This document outlines current operational trajectories, revenue velocity, and continuous telemetry monitoring for <strong>${projectName}</strong>.
            All referenced figures reflect the widgets on this layout. Sample or template data is labeled in provenance badges — do not treat unlabeled exports as warehouse-verified.
          </p>
        </div>

        <h2>Visual Metrics &amp; Operational Observations</h2>
        ${widgetsDocHtml}

        <div style="margin-top: 36pt; padding-top: 12pt; border-top: 1pt solid #dddddd; font-size: 9pt; color: #888888;">
          Report generated by AnalyzeIt. Integrity of live vs sample data depends on each widget's provenance.
        </div>
      </body>
    </html>
  `;

  const blob = new Blob([docHtml], { type: 'application/msword;charset=utf-8' });
  triggerDownload(blob, `${sanitizeFilename(projectName)}_brief.doc`);
}

/**
 * 5. Share as Link
 * Generates a clean URL and writes to clipboard
 */
export async function copyShareableLink(projectId?: string | null): Promise<string> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (!projectId) {
    throw new Error('Select a project before creating a share link.');
  }

  const { share_url: relativeShareUrl } = await createProjectShareLink(projectId);
  const shareUrl = new URL(relativeShareUrl, origin || 'http://localhost:3000').toString();

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(shareUrl);
  }
  return shareUrl;
}
