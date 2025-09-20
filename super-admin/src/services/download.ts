import { fetchWithAuth } from './auth';

export async function downloadCsvWithAuth(url: string, filename: string) {
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error('Failed to download');
  const blob = await res.blob();
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}