const DEFAULTS = {
  lineTolerance: 3,
  columnTolerance: 40,
  maximumCellWidthRatio: 0.3,
  minimumColumnGapRatio: 0.15,
  minimumTableWidthRatio: 0.35,
  maximumVerticalGap: 24,
  logicalRowGap: 16,
};

/**
 * Groups PDF text items into horizontal lines.
 * PDF coordinates have their origin at the bottom-left,
 * so lines are sorted from top to bottom.
 */
const groupItemsByLine = (items, tolerance) => {
  const sortedItems = [...items].sort((a, b) => b.y - a.y);

  const lines = [];

  for (const item of sortedItems) {
    let line = lines.find(
      (current) => Math.abs(current.y - item.y) <= tolerance,
    );

    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }

    line.items.push(item);
    line.y =
      line.items.reduce((sum, current) => sum + current.y, 0) /
      line.items.length;
  }

  return lines
    .map((line) => ({
      ...line,
      items: line.items.sort((a, b) => a.x - b.x),
    }))
    .sort((a, b) => b.y - a.y);
};

/**
 * Calculates the horizontal center of a PDF text item.
 */
const getItemCenter = (item) => item.x + item.width / 2;

/**
 * Finds possible columns from a line containing at least
 * three horizontally separated text items.
 */
const detectColumns = (line, pageWidth, config) => {
  const maximumCellWidth = pageWidth * config.maximumCellWidthRatio;

  const candidates = line.items.filter(
    (item) => item.width > 0 && item.width <= maximumCellWidth,
  );

  const centers = candidates.map(getItemCenter).sort((a, b) => a - b);

  const columns = [];

  for (const center of centers) {
    const existing = columns.find(
      (column) => Math.abs(column.center - center) <= config.columnTolerance,
    );

    if (existing) {
      existing.centers.push(center);
      existing.center =
        existing.centers.reduce((sum, value) => sum + value, 0) /
        existing.centers.length;
    } else {
      columns.push({
        center,
        centers: [center],
      });
    }
  }

  columns.sort((a, b) => a.center - b.center);

  if (columns.length < 3) return null;

  const gaps = columns
    .slice(1)
    .map((column, index) => column.center - columns[index].center);

  const minimumGap = pageWidth * config.minimumColumnGapRatio;

  if (gaps.some((gap) => gap < minimumGap)) {
    return null;
  }

  const tableWidth = columns[columns.length - 1].center - columns[0].center;

  if (tableWidth < pageWidth * config.minimumTableWidthRatio) {
    return null;
  }

  return columns.map((column) => ({
    center: column.center,
  }));
};

/**
 * Assigns a text item to its nearest detected column.
 */
const getColumnIndex = (item, columns, config) => {
  const center = getItemCenter(item);

  let nearestIndex = -1;
  let nearestDistance = Infinity;

  columns.forEach((column, index) => {
    const distance = Math.abs(center - column.center);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  if (nearestDistance > config.columnTolerance) {
    return -1;
  }

  return nearestIndex;
};

/**
 * Extracts table cells from a group of PDF lines.
 */
const buildTableRows = (lines, columns, config) => {
  const rowBands = [];

  for (const line of lines) {
    const previousBand = rowBands[rowBands.length - 1];

    if (!previousBand || previousBand.y - line.y > config.logicalRowGap) {
      rowBands.push({
        y: line.y,
        lines: [line],
      });
    } else {
      previousBand.lines.push(line);
      previousBand.y =
        previousBand.lines.reduce((sum, current) => sum + current.y, 0) /
        previousBand.lines.length;
    }
  }

  return rowBands
    .map((band) => {
      const cells = columns.map(() => []);

      for (const line of band.lines) {
        for (const item of line.items) {
          const columnIndex = getColumnIndex(item, columns, config);

          if (columnIndex !== -1) {
            cells[columnIndex].push(item);
          }
        }
      }

      return {
        y: band.y,
        cells: cells.map((cellItems) =>
          cellItems
            .sort((a, b) => b.y - a.y || a.x - b.x)
            .map((item) => item.text.trim())
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
        ),
      };
    })
    .filter((row) => row.cells.some(Boolean));
};

/**
 * Extracts table-like structures from a PDF page.
 *
 * This is a heuristic extractor for borderless or
 * coordinate-aligned tables. It does not guarantee
 * correct detection of every PDF table.
 */
export const extractTablesFromPage = (page, options = {}) => {
  const config = {
    ...DEFAULTS,
    ...options,
  };

  const { pageNumber, pageWidth, items } = page;

  if (!Array.isArray(items) || items.length === 0 || !pageWidth) {
    return [];
  }

  const lines = groupItemsByLine(
    items.filter(
      (item) =>
        typeof item.text === "string" &&
        item.text.trim() &&
        Number.isFinite(item.x) &&
        Number.isFinite(item.y) &&
        Number.isFinite(item.width),
    ),
    config.lineTolerance,
  );

  const detectedTables = [];
  const usedLineIndexes = new Set();

  for (let anchorIndex = 0; anchorIndex < lines.length; anchorIndex++) {
    if (usedLineIndexes.has(anchorIndex)) continue;

    const columns = detectColumns(lines[anchorIndex], pageWidth, config);

    if (!columns) continue;

    const tableLines = [lines[anchorIndex]];
    const tableLineIndexes = [anchorIndex];

    // Expand upwards.
    for (let i = anchorIndex - 1; i >= 0; i--) {
      if (
        usedLineIndexes.has(i) ||
        tableLines[0].y - lines[i].y > config.maximumVerticalGap
      ) {
        break;
      }

      const matchingItems = lines[i].items.filter(
        (item) =>
          item.width <= pageWidth * config.maximumCellWidthRatio &&
          getColumnIndex(item, columns, config) !== -1,
      );

      if (matchingItems.length === 0) break;

      tableLines.unshift({
        ...lines[i],
        items: matchingItems,
      });

      tableLineIndexes.unshift(i);
    }

    // Expand downwards.
    for (let i = anchorIndex + 1; i < lines.length; i++) {
      if (
        usedLineIndexes.has(i) ||
        tableLines[tableLines.length - 1].y - lines[i].y >
          config.maximumVerticalGap
      ) {
        break;
      }

      const matchingItems = lines[i].items.filter(
        (item) =>
          item.width <= pageWidth * config.maximumCellWidthRatio &&
          getColumnIndex(item, columns, config) !== -1,
      );

      if (matchingItems.length === 0) break;

      tableLines.push({
        ...lines[i],
        items: matchingItems,
      });

      tableLineIndexes.push(i);
    }

    const rows = buildTableRows(tableLines, columns, config);

    if (rows.length < 2) continue;

    tableLineIndexes.forEach((index) => usedLineIndexes.add(index));

    detectedTables.push({
      pageNumber,
      columnCount: columns.length,
      columns: columns.map((column, index) => ({
        columnNumber: index + 1,
        centerX: Number(column.center.toFixed(2)),
      })),
      rows,
      extractionMethod: "coordinate-based",
    });
  }

  return detectedTables;
};
