/**
 * Export Utilities for Analytics Data
 * Handles CSV and PDF export generation
 */

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Column definitions [{key, label}]
 * @returns {string} CSV formatted string
 */
export const arrayToCSV = (data, columns) => {
  if (!data || data.length === 0) {
    return columns.map((c) => c.label).join(",");
  }

  // Header row
  const header = columns.map((c) => `"${c.label}"`).join(",");

  // Data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let value = row[col.key];

        // Handle nested properties (e.g., "user.name")
        if (col.key.includes(".")) {
          const keys = col.key.split(".");
          value = keys.reduce((obj, key) => obj?.[key], row);
        }

        // Format value
        if (value === null || value === undefined) {
          return '""';
        }
        if (typeof value === "object") {
          value = JSON.stringify(value);
        }
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  return [header, ...rows].join("\n");
};

/**
 * Download CSV file
 * @param {string} csvContent - CSV content string
 * @param {string} filename - Filename without extension
 */
export const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Download JSON file
 * @param {object} data - Data to export
 * @param {string} filename - Filename without extension
 */
export const downloadJSON = (data, filename) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.json`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Format impact data for export
 * @param {object} impactData - Impact dashboard data
 * @returns {object} Formatted export data
 */
export const formatImpactDataForExport = (impactData) => {
  return {
    summary: {
      totalDonations: impactData.totalDonations || 0,
      totalPickups: impactData.totalPickups || 0,
      totalWeight: impactData.totalWeight || 0,
      co2Saved: impactData.co2Saved || 0,
      waterSaved: impactData.waterSaved || 0,
      treesEquivalent: impactData.treesEquivalent || 0,
      mealsProvided: impactData.mealsProvided || 0,
    },
    generatedAt: new Date().toISOString(),
    period: impactData.period || "all-time",
  };
};

/**
 * Column definitions for different export types
 */
export const exportColumns = {
  donations: [
    { key: "title", label: "Item" },
    { key: "category", label: "Category" },
    { key: "quantity", label: "Quantity" },
    { key: "unit", label: "Unit" },
    { key: "status", label: "Status" },
    { key: "recipientName", label: "Recipient" },
    { key: "createdAt", label: "Created Date" },
    { key: "completedAt", label: "Completed Date" },
  ],
  pickups: [
    { key: "listingTitle", label: "Item" },
    { key: "donorName", label: "Donor" },
    { key: "scheduledDate", label: "Scheduled Date" },
    { key: "status", label: "Status" },
    { key: "pickupLocation", label: "Location" },
    { key: "completedAt", label: "Completed Date" },
  ],
  impact: [
    { key: "metric", label: "Metric" },
    { key: "value", label: "Value" },
    { key: "unit", label: "Unit" },
    { key: "description", label: "Description" },
  ],
  transactions: [
    { key: "date", label: "Date" },
    { key: "type", label: "Type" },
    { key: "item", label: "Item" },
    { key: "otherParty", label: "Other Party" },
    { key: "status", label: "Status" },
  ],
};

/**
 * Generate impact report as HTML for PDF printing
 * @param {object} impactData - Impact dashboard data
 * @param {object} user - User information
 * @returns {string} HTML string for PDF generation
 */
export const generateImpactReportHTML = (impactData, user) => {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>DonateLocal Impact Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          padding: 40px;
          color: #333;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #4CAF50;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #4CAF50;
          margin-bottom: 10px;
        }
        .title {
          font-size: 24px;
          color: #333;
          margin-bottom: 5px;
        }
        .subtitle {
          color: #666;
          font-size: 14px;
        }
        .user-info {
          background: #f5f5f5;
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 18px;
          color: #4CAF50;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ddd;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .stat-card {
          background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        }
        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #2e7d32;
        }
        .stat-label {
          color: #555;
          font-size: 12px;
          text-transform: uppercase;
          margin-top: 5px;
        }
        .environmental-impact {
          background: #e3f2fd;
          padding: 25px;
          border-radius: 12px;
          margin-top: 20px;
        }
        .impact-item {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
        .impact-icon {
          font-size: 24px;
          margin-right: 15px;
          width: 40px;
          text-align: center;
        }
        .impact-text strong {
          color: #1976d2;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 12px;
        }
        @media print {
          body { padding: 20px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🎁 DonateLocal</div>
        <div class="title">Impact Report</div>
        <div class="subtitle">Generated on ${date}</div>
      </div>
      
      <div class="user-info">
        <strong>${user?.firstName || "User"} ${
    user?.lastName || ""
  }</strong><br>
        <small>${user?.email || ""}</small>
      </div>
      
      <div class="section">
        <div class="section-title">📊 Your Contribution Summary</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${impactData.totalDonations || 0}</div>
            <div class="stat-label">Items Donated</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${impactData.totalPickups || 0}</div>
            <div class="stat-label">Pickups Completed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${impactData.totalWeight || 0} kg</div>
            <div class="stat-label">Total Weight</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${impactData.mealsProvided || 0}</div>
            <div class="stat-label">Meals Provided</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${impactData.peopleHelped || 0}</div>
            <div class="stat-label">People Helped</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${impactData.communitiesServed || 0}</div>
            <div class="stat-label">Communities Served</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">🌍 Environmental Impact</div>
        <div class="environmental-impact">
          <div class="impact-item">
            <span class="impact-icon">🌳</span>
            <div class="impact-text">
              Equivalent to planting <strong>${
                impactData.treesEquivalent || 0
              } trees</strong>
            </div>
          </div>
          <div class="impact-item">
            <span class="impact-icon">💨</span>
            <div class="impact-text">
              <strong>${
                impactData.co2Saved || 0
              } kg</strong> of CO₂ emissions prevented
            </div>
          </div>
          <div class="impact-item">
            <span class="impact-icon">💧</span>
            <div class="impact-text">
              <strong>${
                impactData.waterSaved || 0
              } liters</strong> of water saved
            </div>
          </div>
          <div class="impact-item">
            <span class="impact-icon">🗑️</span>
            <div class="impact-text">
              <strong>${
                impactData.wasteReduced || 0
              } kg</strong> of waste diverted from landfills
            </div>
          </div>
        </div>
      </div>
      
      <div class="footer">
        <p>Thank you for making a difference with DonateLocal! 💚</p>
        <p style="margin-top: 10px;">This report was automatically generated. Data reflects activity up to ${date}.</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Print/Download impact report as PDF
 * @param {object} impactData - Impact data
 * @param {object} user - User information
 */
export const downloadImpactReportPDF = (impactData, user) => {
  const html = generateImpactReportHTML(impactData, user);

  // Open print dialog
  const printWindow = window.open("", "_blank");
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};

/**
 * Export donations list to CSV
 * @param {Array} donations - Donations array
 * @param {string} filename - Optional filename
 */
export const exportDonationsToCSV = (
  donations,
  filename = "donations-export"
) => {
  const formattedData = donations.map((d) => ({
    title: d.title,
    category: d.category,
    quantity: d.quantity,
    unit: d.unit || "items",
    status: d.status,
    recipientName: d.assignedTo?.firstName
      ? `${d.assignedTo.firstName} ${d.assignedTo.lastName || ""}`
      : "N/A",
    createdAt: new Date(d.createdAt).toLocaleDateString(),
    completedAt: d.completedAt
      ? new Date(d.completedAt).toLocaleDateString()
      : "Pending",
  }));

  const csv = arrayToCSV(formattedData, exportColumns.donations);
  downloadCSV(csv, filename);
};

/**
 * Export impact data to CSV
 * @param {object} impactData - Impact dashboard data
 * @param {string} filename - Optional filename
 */
export const exportImpactToCSV = (impactData, filename = "impact-report") => {
  const rows = [
    {
      metric: "Total Donations",
      value: impactData.totalDonations || 0,
      unit: "items",
      description: "Number of items donated",
    },
    {
      metric: "Total Pickups",
      value: impactData.totalPickups || 0,
      unit: "pickups",
      description: "Number of completed pickups",
    },
    {
      metric: "Total Weight",
      value: impactData.totalWeight || 0,
      unit: "kg",
      description: "Total weight of donations",
    },
    {
      metric: "CO₂ Saved",
      value: impactData.co2Saved || 0,
      unit: "kg",
      description: "Carbon emissions prevented",
    },
    {
      metric: "Water Saved",
      value: impactData.waterSaved || 0,
      unit: "liters",
      description: "Water conserved",
    },
    {
      metric: "Trees Equivalent",
      value: impactData.treesEquivalent || 0,
      unit: "trees",
      description: "Environmental impact in tree equivalents",
    },
    {
      metric: "Meals Provided",
      value: impactData.mealsProvided || 0,
      unit: "meals",
      description: "Estimated meals from food donations",
    },
    {
      metric: "People Helped",
      value: impactData.peopleHelped || 0,
      unit: "people",
      description: "Number of people who received donations",
    },
  ];

  const csv = arrayToCSV(rows, exportColumns.impact);
  downloadCSV(csv, filename);
};

const exportUtils = {
  arrayToCSV,
  downloadCSV,
  downloadJSON,
  formatImpactDataForExport,
  exportColumns,
  generateImpactReportHTML,
  downloadImpactReportPDF,
  exportDonationsToCSV,
  exportImpactToCSV,
};

export default exportUtils;
