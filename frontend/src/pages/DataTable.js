import React from "react";

/**
 * A reusable data table component.
 *
 * @param {object} props
 * @param {boolean} props.loading - Whether the data is currently loading.
 * @param {Array<string>} props.columns - An array of column header strings.
 * @param {Array<object>} props.data - The array of data objects to render.
 * @param {function(object, number): React.ReactNode} props.renderRow - A function that takes a data item and its index, and returns a <tr> element.
 * @param {string} [props.emptyMessage="No data found."] - The message to display when there is no data.
 */
function DataTable({
  loading,
  columns,
  data,
  renderRow,
  emptyMessage = "No data found.",
}) {
  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  return (
    <div className="data-table">
      {data.length === 0 ? (
        <p className="no-data">{emptyMessage}</p>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>{data.map((item, idx) => renderRow(item, idx))}</tbody>
        </table>
      )}
    </div>
  );
}

export default DataTable;
