"use client";

import { useState, useRef } from "react";
import api from "@/lib/api";

export default function CsvImportModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith(".csv")) {
        setErrorMessage("Please select a valid .csv file.");
        setFile(null);
        return;
      }
      setFile(selected);
      setErrorMessage("");
      setResultMessage(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage("Please select a .csv file to import.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setResultMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // POST multipart/form-data to /api/leads/import
      const res = await api.post("/leads/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResultMessage(res.data);
      if (onSuccess) onSuccess();

      // Clear the selected file after successful import
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Failed to import leads. Please verify your CSV columns.";
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Import Leads from CSV
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Bulk upload leads directly into your pipeline
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleUpload} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMessage}
            </div>
          )}

          {resultMessage && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs space-y-1">
              <p className="font-semibold">{resultMessage.message}</p>
              <p>
                Imported: <strong>{resultMessage.imported}</strong> &bull; Skipped:{" "}
                <strong>{resultMessage.skipped}</strong>
              </p>
              {resultMessage.errors?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-green-200 text-[11px] text-red-600 max-h-24 overflow-y-auto">
                  <p className="font-semibold">Skipped rows details:</p>
                  {resultMessage.errors.map((err, i) => (
                    <p key={i}>
                      Row {err.row}: {err.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Drag & Drop File Zone */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition bg-gray-50/50">
            <svg
              className="w-10 h-10 text-gray-400 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-xs font-medium text-gray-700">
              {file ? file.name : "Click to select a CSV file"}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              File format must be <code>.csv</code> (max 5 MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-3 block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100 text-[11px] text-gray-600">
            <span className="font-semibold text-blue-900 block mb-0.5">Required CSV Columns:</span>
            <code>name, country, currency</code> (optional: <code>company, email, phone, amount, stage</code>)
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isUploading || !file}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 rounded-full transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 cursor-pointer disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Importing...</span>
                </>
              ) : (
                "Upload & Import"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
