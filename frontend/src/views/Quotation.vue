<template>
  <div>
    <!-- Action Bar -->
    <div class="d-flex align-center mb-4 flex-wrap ga-2">
      <h1 class="text-h5 font-weight-bold">Quotation</h1>
      <v-spacer />
      <v-btn color="primary" variant="flat" prepend-icon="mdi-printer" @click="printQuote">
        Print
      </v-btn>
      <v-btn color="success" variant="flat" prepend-icon="mdi-content-save" @click="saveQuote">
        Save
      </v-btn>
      <v-btn color="secondary" variant="flat" prepend-icon="mdi-plus" @click="resetQuote">
        New Quote
      </v-btn>
    </div>

    <!-- Quotation Content (printable) -->
    <div ref="quotationRef" class="quotation-page">
      <!-- Green top bar -->
      <div class="green-bar"></div>

      <!-- Header -->
      <div class="quote-header">
        <div class="header-left">
          <div class="company-name">HAUS SIGNS</div>
          <div class="company-info">
            Karuhatan, Manotoc, 15 F. Lazaro, Valenzuela, 1442 Metro Manila
          </div>
          <div class="company-info">09105 838383</div>
          <div class="company-info">signs.haus@gmail.com</div>
        </div>
        <div class="header-logo">
          <img src="/haus-signs-logo.png" alt="HAUS SIGNS Logo" class="logo-image" />
        </div>
      </div>

      <!-- Client Info + Quote Label -->
      <div class="client-section">
        <div class="client-fields">
          <div class="client-row">
            <span class="client-label">CLIENT'S NAME :</span>
            <input v-model="quote.clientName" class="client-input" placeholder="Enter client name" />
          </div>
          <div class="client-row">
            <span class="client-label">ADDRESS :</span>
            <input v-model="quote.address" class="client-input" placeholder="Enter address" />
          </div>
          <div class="client-row">
            <span class="client-label">CONTACT :</span>
            <input v-model="quote.contact" class="client-input" placeholder="Enter contact" />
          </div>
        </div>
        <div class="quote-label-section">
          <div class="quote-label">QUOTE</div>
          <div class="date-row">
            <span class="date-label">DATE :</span>
            <input v-model="quote.date" type="date" class="date-input" />
          </div>
          <div class="date-row">
            <span class="date-label">VALID UNTIL :</span>
            <span class="date-value">{{ expiryDate }}</span>
          </div>
        </div>
      </div>

      <!-- Remaining Balance -->
      <div class="remaining-balance-row">
        <div class="remaining-label">REMAINING BALANCE :</div>
        <div class="remaining-value">{{ formatCurrency(remainingBalance) }}</div>
      </div>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th class="col-item">ITEM NO.</th>
            <th class="col-qty">QTY</th>
            <th class="col-pc">PC</th>
            <th class="col-desc">DESCRIPTION</th>
            <th class="col-price">UNIT PRICE</th>
            <th class="col-amount">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in quote.items" :key="index">
            <td class="text-center">{{ index + 1 }}</td>
            <td>
              <input v-model.number="item.qty" type="number" min="0" class="table-input text-center" @input="recalc" />
            </td>
            <td>
              <input v-model.number="item.pc" type="number" min="0" class="table-input text-center" @input="recalc" />
            </td>
            <td>
              <input v-model="item.description" class="table-input" placeholder="Item description" />
            </td>
            <td>
              <input v-model.number="item.unitPrice" type="number" min="0" class="table-input text-right" @input="recalc" />
            </td>
            <td class="text-right amount-cell">{{ formatCurrency(item.qty * (item.pc || 1) * item.unitPrice) }}</td>
          </tr>
          <!-- Empty rows for presentation -->
          <tr v-for="n in emptyRows" :key="'empty-' + n">
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <!-- Add/Remove row button (not printed) -->
      <div class="row-actions no-print">
        <v-btn size="small" variant="text" color="primary" prepend-icon="mdi-plus" @click="addItem">Add Item</v-btn>
        <v-btn v-if="quote.items.length > 1" size="small" variant="text" color="error" prepend-icon="mdi-minus" @click="removeItem">Remove Last</v-btn>
      </div>

      <!-- Totals Section -->
      <div class="totals-section">
        <table class="totals-table">
          <tbody>
            <tr>
              <td class="totals-label">SUB TOTAL:</td>
              <td class="totals-value green-bg">{{ formatCurrency(subTotal) }}</td>
            </tr>
            <tr>
              <td class="totals-label">DISCOUNT:</td>
              <td class="totals-value green-bg">
                <input v-model.number="quote.discount" type="number" min="0" class="totals-input" @input="recalc" />
              </td>
            </tr>
            <tr>
              <td class="totals-label">DEPOSIT :</td>
              <td class="totals-value green-bg">
                <input v-model.number="quote.deposit" type="number" min="0" class="totals-input" @input="recalc" />
              </td>
            </tr>
            <tr>
              <td class="totals-label">12% VAT</td>
              <td class="totals-value green-bg">{{ formatCurrency(vat) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Payment and Warranty Section -->
      <div class="payment-warranty-row">
        <!-- Payment Terms (Left side) -->
        <div class="payment-terms">
          <div class="section-title">Payment Terms:</div>
          <div class="terms-text">A 30% down payment is required to proceed with the order.</div>
          <div class="terms-text">70% balance upon completion and prior to delivery/installation</div>
        </div>

        <!-- Payment + Warranty (Right side) -->
        <div class="payment-right">
          <!-- Payment Options -->
          <div class="payment-options-box">
            <div class="payment-title">PAYMENT OPTIONS</div>
            <div class="payment-detail"><strong>Bank:</strong> BDO</div>
            <div class="payment-detail"><strong>Bank Number:</strong> 0029 0021 6539</div>
            <div class="payment-detail"><strong>Bank Name:</strong> Jertrude Sagad</div>
            <div class="qr-section">
              <img src="/bdo-qr-code.png" alt="BDO QR Code" class="qr-image" />
            </div>
          </div>

          <!-- Warranty -->
          <div class="warranty-box">
            <div class="warranty-title">WARRANTY</div>
            <div class="warranty-value">10 months</div>
          </div>
        </div>
      </div>

      <!-- Timeline Section -->
      <div class="timeline-section">
        <div class="timeline-header">
          <span class="section-title">TIMELINE :</span>
        </div>
        <div class="timeline-content">
          <div>Editing Timeline: 3-5 days</div>
          <div>Production Timeline: 7-15 days</div>
          <div class="timeline-note">Production lead time starts once the final layout is approved.</div>
        </div>
      </div>

      <!-- Company Tagline -->
      <div class="tagline">
        HAUS SIGNS - " Elevate Your Business with Premium Signage "
      </div>

      <!-- Service Categories -->
      <div class="service-categories">
        <div class="service-item">BOX LIGHTED LOGO</div>
        <div class="service-item">3D TEXT</div>
        <div class="service-item">SIGNAGE</div>
      </div>

      <!-- Footer -->
      <div class="quote-footer">
        <div class="footer-text">
          If you have any questions regarding the quotation, please feel free to contact us at or email us at
        </div>
        <div class="footer-thanks">Thank you for supporting our business!</div>
      </div>

      <!-- Green bottom bar -->
      <div class="green-bar"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface QuoteItem {
  qty: number
  pc: number
  description: string
  unitPrice: number
}

interface Quote {
  clientName: string
  address: string
  contact: string
  date: string
  items: QuoteItem[]
  discount: number
  deposit: number
}

const today = new Date().toISOString().split('T')[0]

const quote = ref<Quote>({
  clientName: '',
  address: '',
  contact: '',
  date: today,
  items: [
    { qty: 1, pc: 1, description: '', unitPrice: 0 },
  ],
  discount: 0,
  deposit: 0,
})

const expiryDate = computed(() => {
  if (!quote.value.date) return ''
  const d = new Date(quote.value.date)
  d.setDate(d.getDate() + 15)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
})

const quotationRef = ref<HTMLElement | null>(null)

const MIN_TABLE_ROWS = 10

const emptyRows = computed(() => {
  const diff = MIN_TABLE_ROWS - quote.value.items.length
  return diff > 0 ? diff : 0
})

const subTotal = computed(() => {
  return quote.value.items.reduce((sum, item) => {
    return sum + (item.qty * (item.pc || 1) * item.unitPrice)
  }, 0)
})

const vat = computed(() => {
  const afterDiscount = subTotal.value - (quote.value.discount || 0)
  return afterDiscount * 0.12
})

const remainingBalance = computed(() => {
  const afterDiscount = subTotal.value - (quote.value.discount || 0)
  const total = afterDiscount + vat.value
  return total - (quote.value.deposit || 0)
})

function recalc() {
  // Reactivity handles it; this is just a placeholder for @input triggers
}

function formatCurrency(amount: number): string {
  return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function addItem() {
  quote.value.items.push({ qty: 1, pc: 1, description: '', unitPrice: 0 })
}

function removeItem() {
  if (quote.value.items.length > 1) {
    quote.value.items.pop()
  }
}

function printQuote() {
  window.print()
}

function saveQuote() {
  const data = JSON.stringify(quote.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `quote-${quote.value.clientName || 'draft'}-${quote.value.date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function resetQuote() {
  quote.value = {
    clientName: '',
    address: '',
    contact: '',
    date: new Date().toISOString().split('T')[0],
    items: [{ qty: 1, pc: 1, description: '', unitPrice: 0 }],
    discount: 0,
    deposit: 0,
  }
}
</script>

<style scoped>
/* ===== Quotation Page Layout ===== */
.quotation-page {
  max-width: 900px;
  margin: 0 auto;
  background: #fff;
  padding: 0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  font-family: 'Merriweather', 'Georgia', serif;
  color: #222;
  font-size: 13px;
  line-height: 1.5;
}

.green-bar {
  height: 8px;
  background: #00e600;
  width: 100%;
}

/* ===== Header ===== */
.quote-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 40px 12px;
}

.header-left {
  flex: 1;
}

.header-logo {
  flex-shrink: 0;
  margin-left: 20px;
}

.logo-image {
  width: 120px;
  height: auto;
}

.company-name {
  font-size: 36px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #000;
  margin-bottom: 12px;
}

.company-info {
  font-size: 12px;
  color: #444;
  line-height: 1.6;
}

/* ===== Client Section ===== */
.client-section {
  display: flex;
  justify-content: space-between;
  padding: 16px 40px;
  gap: 40px;
}

.client-fields {
  flex: 1;
}

.client-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.client-label {
  font-weight: 700;
  min-width: 150px;
  font-size: 13px;
}

.client-input {
  flex: 1;
  border: none;
  border-bottom: 1px solid #333;
  outline: none;
  font-size: 13px;
  padding: 4px 8px;
  font-family: inherit;
  background: transparent;
}

.quote-label-section {
  text-align: right;
  flex-shrink: 0;
}

.quote-label {
  font-size: 28px;
  font-weight: 900;
  color: #000;
  letter-spacing: 2px;
}

.date-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.date-label {
  font-weight: 700;
  font-size: 13px;
}

.date-input {
  border: none;
  border-bottom: 1px solid #333;
  outline: none;
  font-size: 13px;
  padding: 4px 8px;
  font-family: inherit;
  background: transparent;
}

.date-value {
  font-size: 13px;
  padding: 4px 8px;
  font-weight: 600;
}

/* ===== Remaining Balance ===== */
.remaining-balance-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px 40px;
  gap: 16px;
  background: #00e600;
  margin: 0 40px;
}

.remaining-label {
  font-weight: 700;
  font-size: 14px;
  color: #000;
}

.remaining-value {
  font-weight: 700;
  font-size: 16px;
  color: #000;
}

/* ===== Items Table ===== */
.items-table {
  width: calc(100% - 80px);
  margin: 0 40px;
  border-collapse: collapse;
  font-size: 13px;
}

.items-table thead tr {
  background: #00e600;
}

.items-table th {
  padding: 8px 12px;
  font-weight: 700;
  text-align: center;
  border: 1px solid #333;
  font-size: 12px;
  color: #000;
}

.items-table td {
  padding: 4px 8px;
  border: 1px solid #ccc;
  min-height: 28px;
}

.col-item { width: 80px; }
.col-qty { width: 60px; }
.col-pc { width: 60px; }
.col-desc { width: auto; }
.col-price { width: 100px; }
.col-amount { width: 110px; }

.table-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 13px;
  padding: 2px 4px;
  font-family: inherit;
  background: transparent;
}

.text-center { text-align: center; }
.text-right { text-align: right; }

.amount-cell {
  font-weight: 600;
}

/* ===== Row Actions (no print) ===== */
.row-actions {
  padding: 8px 40px;
  display: flex;
  gap: 8px;
}

/* ===== Totals Section ===== */
.totals-section {
  display: flex;
  justify-content: flex-end;
  padding: 16px 40px;
}

.totals-table {
  border-collapse: collapse;
}

.totals-table td {
  padding: 3px 0;
}

.totals-label {
  font-weight: 700;
  font-size: 13px;
  text-align: right;
  padding-right: 12px;
  white-space: nowrap;
}

.totals-value {
  width: 140px;
  text-align: right;
  font-weight: 600;
  padding: 4px 12px;
  font-size: 13px;
}

.green-bg {
  background: #00e600;
  color: #000;
}

.totals-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 13px;
  padding: 2px 4px;
  text-align: right;
  font-family: inherit;
  background: transparent;
  font-weight: 600;
}

/* ===== Payment & Warranty ===== */
.payment-warranty-row {
  display: flex;
  padding: 20px 40px;
  gap: 40px;
}

.payment-terms {
  flex: 1;
}

.section-title {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 8px;
}

.terms-text {
  font-size: 12px;
  color: #444;
  line-height: 1.6;
}

.payment-right {
  flex-shrink: 0;
  width: 280px;
}

.payment-options-box {
  border: 1px solid #333;
  padding: 12px;
  margin-bottom: 12px;
}

.payment-title {
  font-weight: 900;
  font-size: 15px;
  text-align: center;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.payment-detail {
  font-size: 13px;
  margin-bottom: 4px;
}

.qr-section {
  text-align: center;
  margin-top: 12px;
}

.qr-image {
  max-width: 200px;
  height: auto;
  border-radius: 4px;
}

.warranty-box {
  border: 1px solid #333;
  text-align: center;
  padding: 8px;
}

.warranty-title {
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 1px;
}

.warranty-value {
  font-size: 13px;
  margin-top: 4px;
}

/* ===== Timeline ===== */
.timeline-section {
  padding: 12px 40px 20px;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.timeline-content {
  font-size: 12px;
  color: #444;
  margin-top: 8px;
  line-height: 1.7;
}

.timeline-note {
  font-style: italic;
  margin-top: 4px;
  color: #666;
}

/* ===== Tagline ===== */
.tagline {
  text-align: center;
  font-weight: 700;
  font-size: 14px;
  padding: 16px 40px 8px;
  letter-spacing: 1px;
}

/* ===== Service Categories ===== */
.service-categories {
  display: flex;
  justify-content: space-around;
  padding: 8px 40px 16px;
}

.service-item {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 1px;
}

/* ===== Footer ===== */
.quote-footer {
  text-align: center;
  padding: 12px 40px 16px;
}

.footer-text {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.footer-thanks {
  font-size: 18px;
  font-weight: 700;
  font-style: italic;
  color: #333;
}

/* ===== Print Styles ===== */
@media print {
  .no-print {
    display: none !important;
  }

  .quotation-page {
    box-shadow: none;
    max-width: none;
    margin: 0;
    padding: 0;
  }

  .client-input,
  .date-input,
  .table-input,
  .totals-input {
    border: none !important;
    border-bottom: none !important;
  }
}
</style>
