import jsPDF from "jspdf";

export interface PayslipData {
  employerAddress: string;
  employeeAddress: string;
  streamId: string;
  streamKey: string;
  tokenSymbol: string;
  startDate: Date;
  generatedDate: Date;
  ratePerSecond: number;
  monthlyRate: number;
  totalStreamed: number;
  totalWithdrawn: number;
  availableBalance: number;
  buffered: number;
  status: string;
  networkName: string;
  payrollContract: string;
}

export function generatePayslipPDF(data: PayslipData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Header bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("PayProof", margin, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Confidential Payslip", margin, 28);
  doc.text("Powered by Zama fhEVM", margin, 34);

  // Document ID on the right
  doc.setFontSize(8);
  doc.text(
    `Generated: ${data.generatedDate.toLocaleString()}`,
    pageWidth - margin,
    28,
    { align: "right" }
  );
  doc.text(`Network: ${data.networkName}`, pageWidth - margin, 34, {
    align: "right",
  });

  y = 52;

  // Encryption badge
  doc.setFillColor(30, 64, 175); // blue-800
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 3, 3, "F");
  doc.setTextColor(191, 219, 254); // blue-200
  doc.setFontSize(9);
  doc.text(
    "This payslip was generated from on-chain encrypted data decrypted locally in the employee's browser.",
    pageWidth / 2,
    y + 7.5,
    { align: "center" }
  );

  y += 20;

  // Reset text color
  doc.setTextColor(30, 41, 59); // slate-800

  // Section: Parties
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Parties", margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const col1 = margin;
  const col2 = pageWidth / 2 + 5;

  // Employer box
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(col1, y, (pageWidth - 2 * margin - 10) / 2, 22, 2, 2, "F");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Employer", col1 + 4, y + 6);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7);
  doc.text(data.employerAddress, col1 + 4, y + 13);

  // Employee box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(col2, y, (pageWidth - 2 * margin - 10) / 2, 22, 2, 2, "F");
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text("Employee", col2 + 4, y + 6);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7);
  doc.text(data.employeeAddress, col2 + 4, y + 13);

  y += 30;

  // Section: Stream Details
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Stream Details", margin, y);
  y += 8;

  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  const drawRow = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin + 4, y + 5);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(value, pageWidth - margin - 4, y + 5, { align: "right" });
    y += 10;
  };

  drawRow("Stream ID", `#${data.streamId.slice(0, 10)}...`);
  drawRow("Status", data.status);
  drawRow("Token", data.tokenSymbol);
  drawRow(
    "Pay Period",
    `${data.startDate.toLocaleDateString()} - ${data.generatedDate.toLocaleDateString()}`
  );

  y += 4;

  // Section: Compensation
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Compensation Summary", margin, y);
  y += 8;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  const formatAmount = (amount: number) =>
    `${amount.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })} ${data.tokenSymbol}`;

  drawRow("Monthly Rate", formatAmount(data.monthlyRate));
  drawRow("Total Streamed", formatAmount(data.totalStreamed));
  drawRow("Total Withdrawn", formatAmount(data.totalWithdrawn));
  drawRow("Buffered Balance", formatAmount(data.buffered));

  // Highlight available balance
  y += 2;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 14, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text("Available Balance", margin + 4, y + 9);
  doc.text(formatAmount(data.availableBalance), pageWidth - margin - 4, y + 9, {
    align: "right",
  });

  y += 24;

  // Section: Verification
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("On-Chain Verification", margin, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Contract Address:", margin + 4, y + 5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.payrollContract, margin + 40, y + 5);
  y += 8;
  doc.setTextColor(100, 116, 139);
  doc.text("Stream Key:", margin + 4, y + 5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(6);
  doc.text(data.streamKey, margin + 40, y + 5);

  y += 14;

  // Etherscan link
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235); // blue-600
  const etherscanUrl = `https://sepolia.etherscan.io/address/${data.payrollContract}`;
  doc.textWithLink("View contract on Etherscan", margin + 4, y, {
    url: etherscanUrl,
  });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    "This payslip was generated client-side from decrypted on-chain data. Amounts were verified using Zama fhEVM encryption.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );
  doc.text(
    "PayProof - Privacy-Preserving Payroll",
    pageWidth / 2,
    footerY + 5,
    { align: "center" }
  );

  // Download
  const filename = `payslip_${data.streamId.slice(0, 8)}_${data.generatedDate.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
