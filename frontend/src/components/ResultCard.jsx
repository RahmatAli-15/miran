import React from "react";

export default function ResultCard({ title, content }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
      <h4 className="font-medium mb-2">{title}</h4>
      <pre className="text-xs max-h-64 overflow-auto bg-gray-50 dark:bg-gray-900 p-3 rounded">{content}</pre>
    </div>
  );
}
