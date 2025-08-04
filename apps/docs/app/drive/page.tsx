"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export default function DrivePage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async (pageToken?: string, search?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (pageToken) params.append("pageToken", pageToken);
      if (search) params.append("search", search);

      const response = await fetch(`/api/drive?${params}`);

      if (response.status === 401) {
        router.push("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }

      const data = await response.json();

      if (pageToken) {
        setFiles((prev) => [...prev, ...data.files]);
      } else {
        setFiles(data.files);
      }

      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles(undefined, searchTerm);
  };

  const formatBytes = (bytes?: string) => {
    if (!bytes) return "";
    const size = parseInt(bytes);
    if (size === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading && files.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">My Google Drive Files</h1>

        {/* 검색 */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search files..." className="flex-1 px-4 py-2 border rounded-md" />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Search
          </button>
        </form>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</div>}

        {/* 파일 목록 */}
        <div className="bg-white rounded-lg shadow">
          {files.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No files found</p>
          ) : (
            <ul className="divide-y">
              {files.map((file) => (
                <li key={file.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {file.iconLink && <img src={file.iconLink} alt="" className="w-5 h-5" />}
                    <div className="flex-1">
                      <h3 className="font-medium">
                        {file.webViewLink ? (
                          <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                            {file.name}
                          </a>
                        ) : (
                          file.name
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatBytes(file.size)}
                        {file.modifiedTime && <span className="ml-2">• {new Date(file.modifiedTime).toLocaleDateString()}</span>}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Load More */}
        {nextPageToken && (
          <div className="mt-4 text-center">
            <button onClick={() => fetchFiles(nextPageToken, searchTerm)} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
