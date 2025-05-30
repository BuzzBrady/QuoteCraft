// QuoteCraftV6/functions/src/index.ts
import { onCall, HttpsOptions, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import admin from "firebase-admin";
import puppeteer, { PDFOptions, Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import handlebars from "handlebars";
import { Buffer } from "node:buffer";

admin.initializeApp();
const db = admin.firestore();

export type QuoteExportLevel = "summary" | "standardDetail" | "fullDetail";

// --- HTML TEMPLATE ---
const HTML_QUOTE_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quote {{quote.quoteNumber}}</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333; background-color: #ffffff; }
        .page-container { width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; box-sizing: border-box; page-break-after: always; }
        .page-container:last-child { page-break-after: auto; }
        h1, h2, h3, h4 { margin: 0 0 0.5em 0; color: #222; font-weight: bold; }
        p { margin: 0 0 0.75em 0; }
        strong { font-weight: bold; }
        small { font-size: 0.85em; color: #555; }
        hr { border: none; border-top: 1px solid #eee; margin: 20px 0; }
        .pdf-header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #363636; }
        .company-branding-left { width: 60%; text-align: left; }
        .company-logo { max-width: 180px; max-height: 70px; margin-bottom: 10px; }
        .company-name-header { font-size: 16pt; font-weight: bold; color: #363636; margin: 0 0 5px 0; }
        .company-contact-details { font-size: 9pt; line-height: 1.3; }
        .quote-title-right { width: 38%; text-align: right; }
        .quote-title-right h1 { font-size: 20pt; text-transform: uppercase; color: #363636; border-bottom: none; padding-bottom: 0; margin-bottom: 5px; }
        .quote-title-right p { margin-bottom: 2px; font-size: 9pt; }
        .meta-info-block { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 10px; background-color: #f8f8f8; border: 1px solid #eeeeee; border-radius: 3px; font-size: 9pt; }
        .meta-column { width: 32%; padding: 0 5px; box-sizing: border-box; }
        .meta-column:first-child { padding-left: 0; } .meta-column:last-child { padding-right: 0; }
        .meta-column h4 { font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #555555; margin-bottom: 5px; border-bottom: 1px solid #dddddd; padding-bottom: 2px; }
        .meta-column p { margin-bottom: 3px; line-height: 1.4; }
        .job-title-main { font-size: 1.3em; font-weight: bold; text-align: center; margin-bottom: 20px; padding: 8px; background-color: #f0f0f0; border-radius: 3px; }
        .content-columns-container { display: flex; justify-content: space-between; gap: 15mm; margin-top: 15px; margin-bottom: 20px; }
        .scope-column { width: 60%; } .details-column { width: 35%; font-size: 0.9em; }
        .scope-column h3, .details-column h3 { font-size: 11pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; }
        .pre-wrap { white-space: pre-wrap; }
        .area-breakdown-table { width: 100%; margin-top: 10px; border-collapse: collapse; font-size: 9pt; }
        .area-breakdown-table th, .area-breakdown-table td { padding: 5px 4px; text-align: left; border-bottom: 1px dotted #cccccc; }
        .area-breakdown-table th { font-weight: bold; text-transform: uppercase; font-size: 8pt; color: #444; }
        .area-breakdown-table td.quantities { text-align: center; width: 30%;}
        .area-breakdown-table td.cost { text-align: right; font-weight: bold; width: 30%;}
        table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9pt; }
        table.items-table th, table.items-table td { border: 1px solid #ddd; padding: 7px 8px; text-align: left; vertical-align: top; }
        table.items-table th { background-color: #f0f0f0; font-weight: bold; }
        table.items-table td.amount, table.items-table th.amount { text-align: right; }
        table.items-table td.description-cell { width: 45%; }
        table.items-table td.qty-cell, table.items-table th.qty-cell { text-align: center; width: 10%; }
        table.items-table td.unit-cell, table.items-table th.unit-cell { width: 10%; }
        .section-header-row td { background-color: #e9e9e9; font-weight: bold; padding: 8px; border-top: 1.5px solid #bbb; }
        .section-subtotal-row td { text-align: right; font-weight: bold; padding-top: 8px; border-top: 1px solid #ccc; }
        .financial-summary-container { margin-top: 20px; margin-bottom: 25px; display: flex; justify-content: flex-end; }
        .totals-table { width: auto; min-width: 280px; font-size: 10pt; }
        .totals-table td { padding: 7px 10px; text-align: right; }
        .totals-table td:first-child { font-weight: 500; color: #444; }
        .totals-table tr.grand-total td { font-weight: bold; font-size: 12pt; color: #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000; padding-top: 8px; padding-bottom: 8px; }
        .notes-terms-section { margin-top: 25px; padding-top: 10px; border-top: 1px solid #dddddd; font-size: 8pt; line-height: 1.3; }
        .notes-terms-section h3 { font-size: 10pt; margin-bottom: 8px; }
        .terms-content-columns { columns: 2; column-gap: 15mm; -webkit-columns: 2; -webkit-column-gap: 15mm; -moz-columns: 2; -moz-column-gap: 15mm;}
        .how-to-proceed { margin-top: 20px; padding: 12px; background-color: #f9f9f9; border: 1px solid #eee; border-radius: 3px; font-size: 8.5pt; }
        .how-to-proceed h3 { margin-top: 0; font-size: 10pt; }
        .pdf-footer { text-align: center; margin-top: 25px; padding-top: 10px; border-top: 1px solid #cccccc; font-size: 7.5pt; color: #777777; }
        .footer-logo { max-height: 35px; margin-bottom: 5px; }
        .clear { clear:both; }
        .summary-only-notice { font-style: italic; font-size: 9pt; color: #666; margin-top: 15px; text-align: center; }
        .items-table-container { margin-top:15px; }
        .debug-h1 { background-color: yellow; color: black; padding: 5px; text-align: center; font-size: 14pt !important; }
    </style>
</head>
<body>
    <div class="page-container">
        <div class="pdf-header-section">
            <div class="company-branding-left">
                {{#if userProfile.logoUrl}}<img src="{{userProfile.logoUrl}}" alt="{{userProfile.businessName}} Logo" class="company-logo">{{/if}}
                <div class="company-name-header">{{userProfile.businessName}}</div>
                <div class="company-contact-details">
                    {{#if userProfile.companyAddress}}{{{breaklines userProfile.companyAddress}}}<br>{{/if}}
                    {{#if userProfile.companyPhone}}P: {{userProfile.companyPhone}} {{/if}}
                    {{#if userProfile.companyEmail}}E: {{userProfile.companyEmail}}<br>{{/if}}
                    {{#if userProfile.abnOrTaxId}}ABN/Tax ID: {{userProfile.abnOrTaxId}}{{/if}}
                </div>
            </div>
            <div class="quote-title-right">
                <h1>Quote</h1>
                <p><strong>Quote Number:</strong> {{quote.quoteNumber}}</p>
            </div>
        </div>
        <div class="meta-info-block">
            <div class="meta-column">
                <h4>Addressed To:</h4>
                <p>
                    {{#if quote.clientName}}<strong>{{quote.clientName}}</strong><br>{{/if}}
                    {{#if quote.clientAddress}}{{{breaklines quote.clientAddress}}}<br>{{/if}}
                    {{#if quote.clientPhone}}P: {{quote.clientPhone}}<br>{{/if}}
                    {{#if quote.clientEmail}}E: {{quote.clientEmail}}{{/if}}
                </p>
            </div>
            <div class="meta-column">
                <h4>Description</h4>
                <p class="pre-wrap">{{#if quote.jobTitle}}{{quote.jobTitle}}{{else}}Scope as detailed below.{{/if}}</p>
                <p><strong>Date of Issue:</strong> {{dateIssued}}</p>
                {{#if validUntilFormatted}}<p><strong>Expiration Date:</strong> {{validUntilFormatted}}</p>{{/if}}
            </div>
            <div class="meta-column">
                <h4>Contact Information</h4>
                <p>
                    {{#if userProfile.salesContactPerson}}<strong>{{userProfile.salesContactPerson}}</strong><br>{{/if}}
                    {{#if userProfile.companyPhone}}P: {{userProfile.companyPhone}}<br>{{/if}}
                    {{#if userProfile.companyEmail}}E: {{userProfile.companyEmail}}<br>{{/if}}
                    {{#if userProfile.companyWebsite}}W: {{userProfile.companyWebsite}}<br>{{/if}}
                    {{{breaklines userProfile.companyAddress}}}
                </p>
            </div>
        </div>

        {{#if isSummary}}
            <div class="job-title-main">Quote Summary: {{quote.jobTitle}}</div>
        {{else}}
            <div class="job-title-main">{{quote.jobTitle}}</div>
        {{/if}}

        {{#if isSummary}}
            <h1 class="debug-h1">DEBUG: SUMMARY PDF CONTENT</h1>
            <div class="content-columns-container">
                <div class="scope-column">
                    <h3>Scope Overview</h3>
                    {{#if quote.projectDescription}}
                        <p class="pre-wrap">{{{breaklines quote.projectDescription}}}</p>
                    {{else}}
                        <p>A summary of costs is provided. Detailed breakdown available in other export options or upon request.</p>
                    {{/if}}
                </div>
                <div class="details-column">
                    <h3>Summary of Costs by Area</h3>
                    {{#if groupedLineItemsShort.length}}
                    <table class="area-breakdown-table">
                        <thead><tr><th>Area/Category</th>{{#if showUnitPrices}}<th class="quantities">Items</th>{{/if}}<th class="cost">Total Cost</th></tr></thead>
                        <tbody>
                            {{#each groupedLineItemsShort}}
                                <tr>
                                    <td><strong>{{this.sectionName}}</strong></td>
                                    {{#if ../showUnitPrices}}
                                        <td class="quantities">{{this.summaryQuantities}}</td>
                                    {{/if}}
                                    <td class="cost">{{formatCurrency this.sectionSubtotal ../currencyCode}}</td>
                                </tr>
                            {{/each}}
                        </tbody>
                    </table>
                    {{else}}
                        <p>Overall project total listed below.</p>
                    {{/if}} {{!-- Corrected from {{/unless}} --}}
                </div>
            </div>
        {{/if}}

        {{#if isStandardDetail}}
            <h1 class="debug-h1">DEBUG: STANDARD DETAIL PDF CONTENT</h1>
            <div class="content-columns-container">
                 <div class="scope-column">
                    <h3>Scope of Works</h3>
                    {{#if quote.projectDescription}}
                        <div class="pre-wrap">{{{breaklines quote.projectDescription}}}</div>
                    {{else}}
                        <p>Details are itemized below or in the additional details section.</p>
                    {{/if}}
                </div>
                <div class="details-column">
                    {{#if quote.additionalDetails}}
                        <h3>Additional Details</h3>
                        <div class="pre-wrap">{{{breaklines quote.additionalDetails}}}</div>
                    {{/if}}
                </div>
            </div>
            <div class="items-table-container">
                <h3>Itemized Costs</h3>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th class="description-cell">Description</th>
                            <th class="qty-cell">Qty</th>
                            <th class="unit-cell">Unit</th>
                            {{#if showUnitPrices}}<th class="amount">Unit Price</th>{{/if}}
                            <th class="amount">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{#each groupedLineItemsFull}}
                            <tr><td colspan="{{#if ../showUnitPrices}}5{{else}}4{{/if}}" class="section-header-row">{{this.sectionName}}</td></tr>
                            {{#each this.items}}
                            <tr>
                                <td class="description-cell"><strong>{{this.displayName}}</strong>{{#if this.description}}<br><small>{{{breaklines this.description}}}</small>{{/if}}</td>
                                <td class="qty-cell">{{this.quantity}}</td>
                                <td class="unit-cell">{{this.unit}}</td>
                                {{#if ../../showUnitPrices}}
                                    <td class="amount">{{formatCurrency this.unitPrice ../../../currencyCode}}</td>
                                {{/if}}
                                <td class="amount">{{formatCurrency this.lineTotal ../../../currencyCode}}</td>
                            </tr>
                            {{/each}}
                            {{#if this.sectionSubtotal}}
                            <tr><td colspan="{{#if ../showUnitPrices}}4{{else}}3{{/if}}" class="section-subtotal-row">Section Subtotal:</td><td class="amount" style="font-weight: bold;">{{formatCurrency this.sectionSubtotal ../../currencyCode}}</td></tr>
                            {{/if}}
                        {{/each}}
                    </tbody>
                </table>
            </div>
        {{/if}}

        {{#if isFullDetail}}
            <h1 class="debug-h1">DEBUG: FULL DETAIL PDF CONTENT</h1>
            {{#if showFullItemizedTable}}
                <div class="content-columns-container">
                    <div class="scope-column">
                        <h3>Scope of Works</h3>
                        {{#if quote.projectDescription}}
                            <div class="pre-wrap">{{{breaklines quote.projectDescription}}}</div>
                        {{else}}
                            <p>Details are itemized below or in the additional details section.</p>
                        {{/if}}
                    </div>
                    <div class="details-column">
                        {{#if quote.additionalDetails}}
                            <h3>Additional Details</h3>
                            <div class="pre-wrap">{{{breaklines quote.additionalDetails}}}</div>
                        {{/if}}
                    </div>
                </div>
                <div class="items-table-container">
                    <h3>Detailed Itemized Breakdown</h3>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th class="description-cell">Description</th>
                                <th class="qty-cell">Qty</th>
                                <th class="unit-cell">Unit</th>
                                {{#if showUnitPrices}}<th class="amount">Unit Price</th>{{/if}}
                                <th class="amount">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {{#each groupedLineItemsFull}}
                                <tr><td colspan="{{#if ../showUnitPrices}}5{{else}}4{{/if}}" class="section-header-row">{{this.sectionName}}</td></tr>
                                {{#each this.items}}
                                <tr>
                                    <td class="description-cell"><strong>{{this.displayName}}</strong>{{#if this.description}}<br><small>{{{breaklines this.description}}}</small>{{/if}}</td>
                                    <td class="qty-cell">{{this.quantity}}</td>
                                    <td class="unit-cell">{{this.unit}}</td>
                                    {{#if ../../showUnitPrices}}
                                        <td class="amount">{{formatCurrency this.unitPrice ../../../currencyCode}}</td>
                                    {{/if}}
                                    <td class="amount">{{formatCurrency this.lineTotal ../../../currencyCode}}</td>
                                </tr>
                                {{/each}}
                                {{#if this.sectionSubtotal}}
                                <tr><td colspan="{{#if ../showUnitPrices}}4{{else}}3{{/if}}" class="section-subtotal-row">Section Subtotal:</td><td class="amount" style="font-weight: bold;">{{formatCurrency this.sectionSubtotal ../../currencyCode}}</td></tr>
                                {{/if}}
                            {{/each}}
                        </tbody>
                    </table>
                </div>
            {{else}}
                {{!-- Fallback for Full Detail if showFullItemizedTable is false --}}
                 <div class="content-columns-container">
                    <div class="scope-column">
                        <h3>Scope Overview</h3>
                         {{#if quote.projectDescription}}
                            <p class="pre-wrap">{{{breaklines quote.projectDescription}}}</p>
                        {{else}}
                            <p>A summary of costs is provided below. Full itemized breakdown has been omitted as per profile settings.</p>
                        {{/if}}
                    </div>
                    <div class="details-column">
                        <h3>Summary of Costs by Area</h3>
                        {{#if groupedLineItemsShort.length}}
                        <table class="area-breakdown-table">
                             <thead><tr><th>Area/Category</th>{{#if showUnitPrices}}<th class="quantities">Items</th>{{/if}}<th class="cost">Total Cost</th></tr></thead>
                            <tbody>
                                {{#each groupedLineItemsShort}}
                                     <tr>
                                        <td><strong>{{this.sectionName}}</strong></td>
                                        {{#if ../showUnitPrices}}
                                            <td class="quantities">{{this.summaryQuantities}}</td>
                                        {{/if}}
                                        <td class="cost">{{formatCurrency this.sectionSubtotal ../../currencyCode}}</td>
                                    </tr>
                                {{/each}}
                            </tbody>
                        </table>
                        {{else}}
                            <p>Overall project total listed below.</p>
                        {{/if}} {{!-- Corrected from {{/unless}} --}}
                    </div>
                </div>
                <p class="summary-only-notice">Full itemized breakdown has been omitted as per your profile settings for this quote.</p>
            {{/if}}
        {{/if}}

        <div class="financial-summary-container">
            <table class="totals-table">
                {{#if subtotalBeforeTax}}
                <tr><td>Subtotal:</td><td>{{formatCurrency subtotalBeforeTax currencyCode}}</td></tr>
                <tr><td>GST ({{taxRatePercentage}}%):</td><td>{{formatCurrency taxAmount currencyCode}}</td></tr>
                {{/if}}
                <tr class="grand-total">
                    <td>TOTAL DUE ({{currencyCode}}):</td><td>{{formatCurrency quote.totalAmount currencyCode}}</td>
                </tr>
            </table>
        </div>
        <div class="clear"></div>
    </div>

    <div class="page-container">
        {{#unless isSummary}}
            {{#if quote.generalNotes}}
            <div class="notes-terms-section">
                <h3>General Notes</h3>
                <div class="pre-wrap">{{{breaklines quote.generalNotes}}}</div>
            </div>
            {{/if}}
        {{/unless}}

        {{#if combinedTerms}}
        <div class="notes-terms-section">
            <h3>Terms & Conditions</h3>
            {{#if isSummary}}
                <p><small>Abbreviated terms. Full terms and conditions apply and are available in the detailed version of this quote or upon request.</small></p>
            {{else}}
                 <div class="terms-content-columns pre-wrap">{{{breaklines combinedTerms}}}</div>
            {{/if}}
        </div>
        {{/if}}

        {{#if userProfile.acceptanceInstructions}}
        <div class="notes-terms-section how-to-proceed">
            <h3>How to Proceed</h3>
            <div class="pre-wrap">{{{breaklines userProfile.acceptanceInstructions}}}</div>
        </div>
        {{/if}}

        <div class="pdf-footer">
            {{#if userProfile.logoUrl}}
                <img src="{{userProfile.logoUrl}}" alt="{{userProfile.businessName}} Logo" class="footer-logo">
            {{else}}
                <p><strong>{{userProfile.businessName}}</strong></p>
            {{/if}}
            <p>Quote generated by QuoteCraft</p>
        </div>
    </div>
</body>
</html>
`; // End of HTML_QUOTE_TEMPLATE

// ... (rest of the TypeScript code from the previous correct version, including interface definitions, helpers, and the generateQuotePdf function) ...
// Ensure the interface definitions for QuoteLineData, LineItemForPdf, GroupedLineItemForPdf, SectionSummaryForPdf are present as in the last good version.
// Also ensure the logic for templatePayload, especially for groupedLineItemsShort, showUnitPrices, etc., is as per the last good version.
// The ONLY change in this response is within the HTML_QUOTE_TEMPLATE string itself.

const compiledTemplate = handlebars.compile(HTML_QUOTE_TEMPLATE);

handlebars.registerHelper("breaklines", function(text: unknown) {
  if (typeof text !== "string" || !text) return "";
  const escapedText = handlebars.Utils.escapeExpression(text);
  const brText = escapedText.replace(/(\r\n|\n|\r)/gm, "<br>");
  return new handlebars.SafeString(brText);
});

handlebars.registerHelper("formatCurrency", (amount: number | null | undefined, currencyCodeFromContext?: string): string => {
  const code = typeof currencyCodeFromContext === "string" ? currencyCodeFromContext : "AUD";
  if (amount === null || amount === undefined) {
    return `${code} 0.00`;
  }
  return `${code} ${Number(amount).toFixed(2)}`;
});

const functionOptions: HttpsOptions = {
  timeoutSeconds: 300,
  memory: "2GiB",
  region: "australia-southeast1",
};

interface QuoteLineData {
    section?: string;
    taskId?: string | null;
    materialId?: string | null;
    materialOptionId?: string | null;
    materialOptionName?: string | null;
    displayName?: string;
    description?: string | null;
    quantity?: number | null;
    price?: number | null;
    unit?: string | null;
    referenceRate?: number | null;
    inputType?: "quantity" | "price" | "checkbox" | null;
    lineTotal: number;
    order?: number;
    kitTemplateId?: string | null;
}

interface LineItemForPdf extends QuoteLineData {
    unitPrice?: number | null;
}

interface GroupedLineItemForPdf {
    sectionName: string;
    items: LineItemForPdf[];
    itemCount: number;
    sectionSubtotal: number;
    summaryQuantities?: string;
}

interface SectionSummaryForPdf {
    sectionName: string;
    sectionSubtotal: number;
    summaryQuantities?: string;
    itemCount?: number;
}

interface GeneratePdfRequestData {
    quoteId: string;
    exportLevel: QuoteExportLevel;
}

export const generateQuotePdf = onCall(functionOptions, async (request: CallableRequest<GeneratePdfRequestData>) => {
  logger.info("[PDF Gen Sparticuz] Function called with request data:", JSON.stringify(request.data, null, 2));
  logger.info("[PDF Gen Sparticuz] Auth object:", JSON.stringify(request.auth, null, 2));

  if (!request.auth) {
    logger.error("[PDF Gen Sparticuz] Auth Error: Unauthenticated user.");
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const userId = request.auth.uid;
  const { quoteId, exportLevel } = request.data;

  if (!quoteId || typeof quoteId !== "string") {
    logger.error("[PDF Gen Sparticuz] Invalid Argument: quoteId missing or not a string.", { receivedData: request.data });
    throw new HttpsError("invalid-argument", "The function must be called with a \"quoteId\" string parameter.");
  }

  if (!exportLevel || !["summary", "standardDetail", "fullDetail"].includes(exportLevel)) {
    logger.error("[PDF Gen Sparticuz] Invalid Argument: exportLevel missing or invalid.", { receivedData: request.data });
    throw new HttpsError("invalid-argument", "Invalid or missing \"exportLevel\". Must be 'summary', 'standardDetail', or 'fullDetail'.");
  }

  try {
    logger.info(`[PDF Gen Sparticuz] START - QuoteID: ${quoteId}, UserID: ${userId}, ExportLevel: ${exportLevel}`);

    const userProfileRef = db.doc(`users/${userId}`);
    const quoteRef = db.doc(`users/${userId}/quotes/${quoteId}`);
    const [userProfileSnap, quoteSnap] = await Promise.all([
      userProfileRef.get(),
      quoteRef.get(),
    ]);

    if (!userProfileSnap.exists) {
      logger.error(`[PDF Gen Sparticuz] User profile NOT FOUND for UID: ${userId}`);
      throw new HttpsError("not-found", `User profile not found for UID: ${userId}. Please complete your profile settings.`);
    }
    const userProfileData = userProfileSnap.data() || {};
    logger.info("[PDF Gen Sparticuz] User profile fetched.");

    if (!quoteSnap.exists) {
      logger.error(`[PDF Gen Sparticuz] Quote NOT FOUND: ${quoteId} for user ${userId}`);
      throw new HttpsError("not-found", `Quote not found: ${quoteId}`);
    }
    const quoteDataFromDb = quoteSnap.data() || {};
    logger.info("[PDF Gen Sparticuz] Quote data fetched.");

    const linesRef = quoteRef.collection("quoteLines");
    const linesSnap = await linesRef.orderBy("order").get();
    const fetchedLineItemsData: QuoteLineData[] = linesSnap.docs.map(docValue => docValue.data() as QuoteLineData);
    logger.info(`[PDF Gen Sparticuz] Fetched ${fetchedLineItemsData.length} line items.`);

    const groupedLineItemsFull: GroupedLineItemForPdf[] = fetchedLineItemsData.reduce<GroupedLineItemForPdf[]>((acc, line) => {
      const sectionName = line.section || "Uncategorized";
      let section = acc.find(s => s.sectionName === sectionName);
      if (!section) {
        section = { sectionName, items: [], itemCount: 0, sectionSubtotal: 0, summaryQuantities: "" };
        acc.push(section);
      }
      const unitPrice = line.inputType === "price" ? line.price : line.referenceRate;
      section.items.push({ ...line, unitPrice: unitPrice ?? null });
      section.itemCount += 1;
      section.sectionSubtotal += line.lineTotal || 0;
      let itemQtyUnit = "";
      if (line.quantity && line.unit) { itemQtyUnit = `${line.quantity} ${line.unit}`; }
      else if (line.price && !line.quantity) { itemQtyUnit = "Fixed Price"; }
      else if (line.quantity) { itemQtyUnit = `${line.quantity} units`;}
      else { itemQtyUnit = "Included"; }
      if (itemQtyUnit && typeof section.summaryQuantities === "string") {
        section.summaryQuantities += (section.summaryQuantities ? "; " : "") + itemQtyUnit;
      }
      return acc;
    }, []);

    const groupedLineItemsShort: SectionSummaryForPdf[] = groupedLineItemsFull.map(section => ({
      sectionName: section.sectionName,
      sectionSubtotal: section.sectionSubtotal,
      summaryQuantities: section.summaryQuantities,
      itemCount: section.itemCount,
    }));

    let combinedTerms = "";
    if (quoteDataFromDb.terms) combinedTerms += quoteDataFromDb.terms;
    if (userProfileData.defaultQuoteTerms) {
      if (combinedTerms) combinedTerms += "\n\n\n";
      combinedTerms += userProfileData.defaultQuoteTerms;
    }

    const taxRate = (userProfileData.taxRate as number | undefined) ?? 0;
    const totalAmount = quoteDataFromDb.totalAmount || 0;
    let subtotalBeforeTaxVal = totalAmount;
    let taxAmountVal = 0;
    if (taxRate > 0 && (1 + taxRate) !== 0) {
      subtotalBeforeTaxVal = totalAmount / (1 + taxRate);
      taxAmountVal = totalAmount - subtotalBeforeTaxVal;
    } else if (taxRate !== 0 && (1 + taxRate) === 0) {
      subtotalBeforeTaxVal = totalAmount;
      taxAmountVal = 0;
    }

    const templatePayload = {
      userProfile: userProfileData,
      quote: quoteDataFromDb,
      groupedLineItemsFull: groupedLineItemsFull,
      groupedLineItemsShort: groupedLineItemsShort,
      isSummary: exportLevel === "summary",
      isStandardDetail: exportLevel === "standardDetail",
      isFullDetail: exportLevel === "fullDetail",
      showFullItemizedTable: (exportLevel === "fullDetail") && (userProfileData.showFullItemizedTableInPdf ?? true),
      showUnitPrices: userProfileData.showUnitPricesInPdf ?? true,
      dateIssued: (quoteDataFromDb.createdAt as admin.firestore.Timestamp)?.toDate().toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) || "N/A",
      validUntilFormatted: (quoteDataFromDb.validUntil as admin.firestore.Timestamp)?.toDate().toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) || null,
      combinedTerms: combinedTerms,
      projectDescription: quoteDataFromDb.projectDescription,
      additionalDetails: quoteDataFromDb.additionalDetails,
      generalNotes: quoteDataFromDb.generalNotes,
      currencyCode: (quoteDataFromDb.currencyCode || userProfileData.currencyCode || "AUD") as string,
      subtotalBeforeTax: taxRate > 0 ? subtotalBeforeTaxVal : null,
      taxAmount: taxRate > 0 ? taxAmountVal : null,
      taxRatePercentage: taxRate > 0 ? (taxRate * 100).toFixed(0) : null,
    };
    logger.info("[PDF Gen Sparticuz] Final Template Payload:", JSON.stringify(templatePayload, null, 2));

    const htmlContent = compiledTemplate(templatePayload);
    logger.info("[PDF Gen Sparticuz] HTML content populated.");

    let browser: Browser | null = null;
    try {
      logger.info("[PDF Gen Sparticuz] Launching Puppeteer with @sparticuz/chromium...");
      const executablePath = await chromium.executablePath();
      logger.info(`[PDF Gen Sparticuz] Using Chromium executablePath: ${executablePath}`);

      if (!executablePath) {
        logger.error("[PDF Gen Sparticuz] Chromium executable path is invalid or not found by @sparticuz/chromium.");
        throw new HttpsError("internal", "Chromium setup failed, executable path not found by @sparticuz/chromium.");
      }

      browser = await puppeteer.launch({
        args: [...chromium.args, "--font-render-hinting=none"],
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
      });

      const page = await browser.newPage();
      logger.info("[PDF Gen Sparticuz] Puppeteer page created. Setting content...");
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });
      logger.info("[PDF Gen Sparticuz] Content set. Generating PDF buffer...");

      const pdfOptions: PDFOptions = {
        format: "A4",
        printBackground: true,
        margin: { top: "15mm", right: "15mm", bottom: "20mm", left: "15mm" },
        displayHeaderFooter: true,
        footerTemplate: "<div style=\"font-size:7pt; width:100%; text-align:center; padding: 0 10mm;\">Page <span class=\"pageNumber\"></span> of <span class=\"totalPages\"></span></div>",
        headerTemplate: "<div></div>",
      };

      const pdfBufferOutput = await page.pdf(pdfOptions);
      const pdfBufferNode: Buffer = Buffer.from(pdfBufferOutput);

      logger.info("[PDF Gen Sparticuz] PDF buffer generated successfully.");
      return { pdfBase64: pdfBufferNode.toString("base64") };

    } catch (puppeteerError: unknown) {
      const error = puppeteerError as Error;
      logger.error("[PDF Gen Sparticuz] Puppeteer operation failed:", { message: error.message, stack: error.stack });
      throw new HttpsError("internal", `PDF generation failed at Puppeteer stage: ${error.message}`);
    } finally {
      if (browser !== null) {
        logger.info("[PDF Gen Sparticuz] Closing Puppeteer browser.");
        await browser.close();
      }
    }

  } catch (error: unknown) {
    const err = error as (Error & { details?: any; code?: string });
    logger.error("[PDF Gen Sparticuz] Error in generateQuotePdf (outer catch):", {
      errorMessage: err.message,
      errorStack: err.stack,
      errorDetails: err.details,
      quoteIdFromRequest: request.data.quoteId,
      userIdFromAuth: request.auth?.uid,
      exportLevelFromRequest: request.data.exportLevel,
    });
    if (error instanceof HttpsError) { throw error; }
    // If the error is the Handlebars mismatch, provide a more specific message
    if (err.message && err.message.includes("if doesn't match unless")) {
      throw new HttpsError("internal", `PDF template error: Mismatched Handlebars block (e.g., an #if was closed with /unless). Details: ${err.message}`);
    }
    throw new HttpsError("internal", `Failed to generate PDF: ${err.message}`);
  }
});