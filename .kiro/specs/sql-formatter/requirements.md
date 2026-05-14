# Requirements Document

## Introduction

SQL Formatter 是一个纯前端、单页面 HTML 应用，运行于浏览器端，无需服务器。用户在左侧输入原始 SQL，右侧实时预览格式化后的带语法高亮的 HTML 输出。MVP 以 PostgreSQL 方言为基础，后续可扩展支持多种 SQL 方言。项目使用 Vite 构建，最终产物为可独立部署的静态资源。

## Glossary

- **Formatter**：负责将原始 SQL 文本转换为格式化后文本的核心模块，基于 `sql-formatter` JS 库实现。
- **Highlighter**：负责对格式化后的 SQL 文本进行语法高亮渲染，输出带 HTML 标签的富文本。
- **Input Panel**：页面左侧的 SQL 输入区域（`<textarea>` 或代码编辑器组件）。
- **Preview Panel**：页面右侧的格式化结果预览区域，展示带语法高亮的 HTML。
- **Dialect**：SQL 方言，如 PostgreSQL、MySQL、SQLite 等，决定关键字集合与语法规则。
- **IN Clause**：SQL 中 `IN (...)` 子句，包含一组值列表。
- **Values Per Line**：IN 子句中每行排列的值数量，由用户通过配置项指定。
- **Statement Separator**：多条 SQL 语句之间插入的空行，用于提升可读性。
- **Config Panel**：页面中提供格式化选项配置的 UI 区域（如方言选择、缩进宽度、每行值数量等）。

---

## Requirements

### Requirement 1：左右分屏布局

**User Story:** As a developer, I want a split-screen layout with input on the left and formatted preview on the right, so that I can see the formatting result alongside my original SQL without switching views.

#### Acceptance Criteria

1. THE Formatter App SHALL render a two-column split-screen layout with the Input Panel occupying the left half and the Preview Panel occupying the right half of the viewport.
2. THE Formatter App SHALL ensure both panels are independently scrollable when content overflows the visible area.
3. THE Formatter App SHALL maintain the split-screen layout on viewport widths of 768px and above.
4. IF the viewport width is below 768px, THEN THE Formatter App SHALL stack the Input Panel above the Preview Panel in a single-column layout.

---

### Requirement 2：实时格式化

**User Story:** As a developer, I want the SQL to be formatted in real time as I type, so that I can immediately see the effect of my edits without manually triggering a format action.

#### Acceptance Criteria

1. WHEN the content of the Input Panel changes, THE Formatter SHALL reformat the SQL and update the Preview Panel within 300ms.
2. WHILE the Input Panel is empty, THE Formatter App SHALL display an empty state placeholder in the Preview Panel.
3. IF the SQL text in the Input Panel cannot be parsed by the Formatter, THEN THE Formatter App SHALL display the original unformatted text in the Preview Panel and show an inline error message indicating a parse failure.
4. THE Formatter App SHALL debounce Input Panel change events with a delay of no more than 300ms before triggering reformatting, to avoid excessive computation during rapid typing.

---

### Requirement 3：SQL 语法高亮

**User Story:** As a developer, I want SQL keywords, identifiers, strings, and comments to be visually distinguished by color, so that I can quickly read and understand the formatted SQL.

#### Acceptance Criteria

1. THE Highlighter SHALL apply distinct color styles to each of the following token categories: keywords (e.g., `SELECT`, `FROM`, `WHERE`), identifiers (table names, column names), string literals, numeric literals, operators, and comments.
2. THE Highlighter SHALL render the highlighted output as valid HTML within the Preview Panel without altering the SQL text content.
3. THE Formatter App SHALL apply syntax highlighting to the formatted SQL on every update of the Preview Panel.
4. WHERE a dark color theme is active, THE Highlighter SHALL use a color palette with sufficient contrast ratios meeting WCAG AA standards (minimum 4.5:1 for normal text).

---

### Requirement 4：对齐与缩进格式化

**User Story:** As a developer, I want SQL clauses and nested expressions to be consistently indented and aligned, so that the structure of complex queries is easy to follow.

#### Acceptance Criteria

1. THE Formatter SHALL indent each SQL clause (e.g., `SELECT`, `FROM`, `WHERE`, `JOIN`, `GROUP BY`, `ORDER BY`, `HAVING`) to a consistent depth using the configured indentation width.
2. THE Formatter SHALL place each top-level clause on a new line.
3. THE Formatter SHALL indent nested subqueries by one additional indentation level relative to the enclosing clause.
4. THE Config Panel SHALL provide a control allowing the user to set the indentation width to 2 or 4 spaces, with a default of 2 spaces.
5. WHEN the user changes the indentation width in the Config Panel, THE Formatter SHALL immediately reformat the SQL in the Preview Panel using the new indentation width.

---

### Requirement 5：多语句空行分隔

**User Story:** As a developer, I want multiple SQL statements separated by blank lines, so that I can visually distinguish individual statements in a script containing many queries.

#### Acceptance Criteria

1. WHEN the Input Panel contains two or more SQL statements separated by semicolons, THE Formatter SHALL insert exactly one blank line between each pair of consecutive formatted statements in the Preview Panel.
2. THE Formatter SHALL preserve the semicolon at the end of each statement after formatting.
3. IF a SQL script contains trailing whitespace or blank lines after the last statement, THEN THE Formatter SHALL omit those trailing blank lines from the formatted output.

---

### Requirement 6：IN 子句值分组换行

**User Story:** As a developer, I want IN clause values to be grouped N per line rather than one per line or all on one line, so that long value lists remain readable without excessive vertical space.

#### Acceptance Criteria

1. THE Config Panel SHALL provide a numeric input control for Values Per Line, accepting integer values between 1 and 100, with a default value of 3.
2. WHEN the Formatter processes an IN clause, THE Formatter SHALL group the values into rows of exactly Values Per Line values each, placing each group on a separate line aligned with the opening parenthesis of the IN clause.
3. IF the total number of values in an IN clause is not evenly divisible by Values Per Line, THEN THE Formatter SHALL place the remaining values on the final line without padding.
4. WHEN the user changes the Values Per Line setting in the Config Panel, THE Formatter SHALL immediately reformat the SQL in the Preview Panel using the new setting.
5. THE Formatter SHALL apply the Values Per Line grouping to all IN clauses present in the SQL input, including those within subqueries.

---

### Requirement 7：SQL 方言选择

**User Story:** As a developer, I want to select the SQL dialect used for formatting, so that dialect-specific keywords and syntax are handled correctly.

#### Acceptance Criteria

1. THE Config Panel SHALL provide a dropdown control listing at least the following dialects: PostgreSQL, MySQL, SQLite, with PostgreSQL selected by default.
2. WHEN the user selects a different dialect in the Config Panel, THE Formatter SHALL reformat the SQL in the Preview Panel using the newly selected dialect's rules within 300ms.
3. THE Formatter SHALL use the `sql-formatter` library's dialect configuration to apply dialect-specific keyword casing and syntax rules.

---

### Requirement 8：输出复制功能

**User Story:** As a developer, I want to copy the formatted SQL to my clipboard with a single action, so that I can quickly paste it into my editor or database client.

#### Acceptance Criteria

1. THE Formatter App SHALL provide a "Copy" button in or adjacent to the Preview Panel.
2. WHEN the user activates the "Copy" button, THE Formatter App SHALL write the plain-text content of the formatted SQL (without HTML tags) to the system clipboard.
3. WHEN the clipboard write operation succeeds, THE Formatter App SHALL display a transient confirmation message for between 1 and 3 seconds, then revert to the default button state.
4. IF the clipboard write operation fails, THEN THE Formatter App SHALL display an inline error message instructing the user to copy the text manually.

---

### Requirement 9：性能与资源约束

**User Story:** As a developer, I want the formatter to remain responsive even with large SQL scripts, so that the tool is usable for real-world workloads without browser lag.

#### Acceptance Criteria

1. THE Formatter SHALL complete formatting and highlighting of SQL input up to 50,000 characters within 500ms on a modern desktop browser (Chrome or Firefox, released within the last 2 years).
2. THE Formatter App SHALL not retain prior SQL input or formatting results in memory after the Input Panel content is cleared, to avoid unbounded memory growth during a session.
3. THE Formatter App SHALL load and become interactive within 3 seconds on a connection with a download speed of 10 Mbps, measured from initial navigation to the page being ready for user input.

---

### Requirement 10：静态资源构建与部署

**User Story:** As a developer, I want the application to be built into self-contained static files, so that it can be deployed to any static hosting environment without a server runtime.

#### Acceptance Criteria

1. THE Formatter App SHALL be built using Vite and produce a `dist/` directory containing all required HTML, CSS, and JavaScript assets.
2. THE Formatter App SHALL function correctly when the `dist/` directory is served from any URL path prefix, with no hard-coded absolute paths in the built assets.
3. THE Formatter App SHALL operate entirely within the browser with no network requests to external APIs or servers during normal use after the initial page load.
