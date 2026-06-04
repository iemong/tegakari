## Page Context
- **URL**: http://localhost:4399/
- **Framework**: React
- **Meta Framework**: Next.js (App Router)
- **Page Title**: Northwind — Billing Dashboard
- **Viewport**: 1280x800
- **Language**: en-US
- **User Agent**: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36

## Annotation #1
**Instruction**: Stream this revenue figure live over a websocket and animate changes.
- **Selector**: `#root > div.app > div.main > div.content > section.metrics > div:nth-child(1) > div.metric-value`
- **Tag**: `<div>`
- **Text**: "$48,290"
- **Attributes**:
  - class: `metric-value`
- **Component**: `App` → `DashboardLayout` → `MetricsGrid` → `MetricCard`
- **Props**: `{ delta: "12.4%", foot: "vs. $42,960 last month", metricKey: "mrr", title: "Monthly revenue", trend: "up", value: "$48,290" }`

## Annotation #2
**Instruction**: Open a slide-over invoice form here instead of navigating to a new page.
- **Selector**: `#root > div.app > div.main > header.topbar > button.btn.btn-primary`
- **Tag**: `<button>`
- **Text**: "＋ New invoice"
- **Attributes**:
  - class: `btn btn-primary`
  - data-testid: `new-invoice-btn`
- **Component**: `App` → `DashboardLayout` → `TopBar` → `PrimaryButton`
- **Props**: `{ disabled: false, label: "New invoice", testId: "new-invoice-btn", variant: "primary" }`
- **State**: `{ state_0: false }`

## Annotation #3
**Instruction**: When a payment fails, show an inline Retry button on this row.
- **Selector**: `#root > div.app > div.main > div.content > div.card > table.table > tbody > tr:nth-child(2) > td:nth-child(2)`
- **Tag**: `<td>`
- **Text**: "#INV-2038"
- **Attributes**:
  - class: `mono`
- **Component**: `App` → `DashboardLayout` → `OrdersTable` → `OrderRow`
- **Props**: `{ order: { amount: "$320.00", color: "#10b981", date: "Jun 03", email: "noah@frameworks.dev", id: "#INV-2038", initials: "NB", name: "Noah Becker", status: "failed" } }`