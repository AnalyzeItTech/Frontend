# AnalyzeIt Widget Primitive Library Manifest

A closed, strictly typed vocabulary of UI primitives for the AI agent to compose dashboards from. The agent never writes raw HTML or CSS; it selects from these 9 primitives and fills typed data slots.

---

## 1. Primitive Manifest

### `metric_card`
- **When to use**: Single headline number, KPI, summary counter.
- **Props**:
  - `label`: Metric name (e.g. `"Nasdaq-100 (QQQ)"`, `"Monthly Recurring Revenue"`)
  - `value`: Main formatted number (e.g. `"$485.20"`, `"1,420"`)
  - `delta`: Optional change string (e.g. `"+1.8%"`, `"-3.2%"`)
  - `trend`: Optional direction: `'up'` | `'down'` | `'flat'`
  - `unit`: Optional currency/unit suffix
  - `freshness`: Timestamp or freshness label (e.g. `"as of 09:40"`)

### `line_chart`
- **When to use**: Continuous time series, trends, intraday pricing, historical performance.
- **Props**:
  - `title`: Chart title (e.g. `"QQQ Intraday Price Trend"`)
  - `series`: Array of `{ x: string, y: number }` points
  - `timeframe`: Optional active interval (e.g. `"1D"`, `"1W"`, `"1M"`, `"1Y"`)
  - `unit`: Value unit (e.g. `"USD"`, `"ms"`)
  - `freshness`: Timestamp label

### `bar_chart`
- **When to use**: Discrete categorical comparisons, monthly/quarterly buckets.
- **Props**:
  - `title`: Bar chart title (e.g. `"Quarterly Revenue"`)
  - `series`: Array of `{ label: string, y: number }`
  - `unit`: Value unit
  - `freshness`: Timestamp label

### `table`
- **When to use**: Multi-column structured data, ranking, inventory, top holdings.
- **Props**:
  - `title`: Table title (e.g. `"Top 5 Nasdaq Holdings"`)
  - `columns`: Array of column header strings (e.g. `["Ticker", "Company", "Weight"]`)
  - `rows`: Array of row arrays `(string | number)[][]`
  - `freshness`: Timestamp label

### `text_block`
- **When to use**: AI analyst commentary, hypothesis synthesis, executive summary, anomaly warnings.
- **Props**:
  - `heading`: Section title
  - `body`: Concise Markdown or plain-text analytical insight
  - `variant`: `'insight'` (blue/neutral) | `'warning'` (amber) | `'summary'` (sage green)
  - `freshness`: Timestamp label

### `progress_ring`
- **When to use**: Goal completion, quota, capacity, percentage metrics.
- **Props**:
  - `label`: Target metric (e.g. `"Q3 ARR Target"`, `"Storage Capacity"`)
  - `percent`: Numeric completion from 0 to 100
  - `sublabel`: Additional context (e.g. `"$850K of $1.0M reached"`)
  - `freshness`: Timestamp label

### `comparison_pair`
- **When to use**: X vs Y comparison, benchmark evaluation, 52-week low vs high, current vs prior period.
- **Props**:
  - `title`: Comparison heading
  - `a`: `{ label: string, value: string, sub?: string }`
  - `b`: `{ label: string, value: string, sub?: string }`
  - `delta`: Optional comparative delta badge (e.g. `"+14.2% vs SPY"`)
  - `freshness`: Timestamp label

### `timeline`
- **When to use**: Chronological sequence of events, deploy milestones, pipeline logs.
- **Props**:
  - `title`: Timeline title
  - `events`: Array of `{ date: string, label: string, description?: string }`
  - `freshness`: Timestamp label

### `heatmap`
- **When to use**: Grid of cells colored by numerical intensity (e.g. correlation matrices, activity by hour, portfolio sector exposure).
- **Props**:
  - `title`: Heatmap title
  - `rows`: Array of row label strings (e.g. `["Mon", "Tue", "Wed", "Thu", "Fri"]`)
  - `cols`: Array of column label strings (e.g. `["09:00", "12:00", "15:00", "18:00"]`)
  - `values`: 2D array of numbers `number[][]` (normalized or raw intensities)
  - `colorScale`: `'warm'` | `'cool'` | `'emerald'`

### `sparkline_list`
- **When to use**: Watchlist / portfolio list of items, each with a mini inline trend sparkline, current value, and delta.
- **Props**:
  - `title`: List title (e.g. `"Technology Watchlist"`)
  - `items`: Array of `{ label: string, value: string, change?: string, trend?: 'up' | 'down' | 'flat', sparkline: number[] }`

### `funnel`
- **When to use**: Sequential stage conversion and drop-off tracking (e.g. signups → activation → paid retention).
- **Props**:
  - `title`: Funnel title
  - `stages`: Array of `{ label: string, value: number, sublabel?: string, rate?: string }`

### `distribution`
- **When to use**: Histogram / bin distribution showing data spread and frequency counts rather than just a single average.
- **Props**:
  - `title`: Distribution title
  - `buckets`: Array of `{ range: string, count: number, percentage?: number }`
  - `unit`: Value unit suffix (e.g. `"users"`, `"ms"`)

### `node_graph`
- **When to use**: Relational topology, service dependencies, transaction networks.
- **Constraints**: Strictly capped at $\le 20$ nodes and $\le 40$ edges to prevent canvas overload.
- **Props**:
  - `title`: Network title
  - `nodes`: Array of `{ id: string, label: string, group?: string, val?: number }`
  - `edges`: Array of `{ source: string, target: string, label?: string }`

### `annotated_chart`
- **When to use**: Continuous time series with spatial event/anomaly callouts and milestone pins.
- **Props**:
  - `title`: Chart title
  - `series`: Array of `{ x: string, y: number }`
  - `annotations`: Array of `{ x: string, label: string, type?: 'anomaly' | 'event' | 'milestone' }`
  - `unit`: Value unit
  - `timeframe`: Time interval (e.g. `"1D"`, `"1W"`)

### `alert_banner`
- **When to use**: Critical system warning, status incident strip, operational threshold alert.
- **Props**:
  - `title`: Banner title
  - `message`: Diagnostic message
  - `severity`: `'info'` | `'warning'` | `'error'` | `'success'`
  - `dismissible`: Optional boolean

### `sandboxed`
- **When to use**: Strictly as a last-resort fallback for custom visualizations when none of the native primitives fit.
- **Props**:
  - `code`: Vanilla HTML/SVG snippet (strictly isolated with null origin CSP)

### `composite_group` (Meta-Primitive)
- **When to use**: Clusters 2–4 leaf primitives under a single unified card with shared header and provenance.
- **Constraints**: Recursion strictly prohibited (depth $\le 1$; children cannot be `composite_group`).
- **Props**:
  - `title`: Group container title
  - `layout`: `'grid'` | `'row'` (default: `'grid'`)
  - `widgets`: Array of 2 to 4 leaf `WidgetSpec` objects

---

## 2. Universal Provenance & Reactive Filtering Slots

All widget primitives support the following universal slots:
- **`provenance`**: Provenance metadata slot displayed in the widget's citation footer.
  ```ts
  {
    kind: 'live_api' | 'verified_db' | 'synthetic_ai',
    source: string, // e.g. "Polygon API", "PostgreSQL prod_telemetry", "Claude 3.5 Sonnet"
    timestamp?: string
  }
  ```
- **`consumesDimensions`**: Array of dimension names that this widget listens to for cross-widget reactive filtering (e.g. `['ticker', 'symbol']`).
- **`emitsDimension`**: The dimension key emitted when a user clicks a row/item in this widget (e.g. `'ticker'`).

---

## 3. Model Tool Output Schema

When the agent uses `dashboard_editor`, it emits:
```json
{
  "action": "propose_layout",
  "widgets": [
    {
      "component": "metric_card",
      "title": "Invesco QQQ Trust",
      "value": "$485.20",
      "change": "+1.8%",
      "positive": true,
      "provenance": { "kind": "live_api", "source": "Nasdaq Consolidated Tape" }
    },
    {
      "component": "annotated_chart",
      "title": "QQQ Intraday Momentum",
      "series": [...],
      "annotations": [{ "x": "11:00", "label": "CPI Release Beat", "type": "event" }],
      "provenance": { "kind": "live_api", "source": "Polygon.io" }
    }
  ]
}
```
