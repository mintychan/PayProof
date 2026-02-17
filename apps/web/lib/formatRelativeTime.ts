/**
 * Formats a Unix timestamp (seconds) into a human-readable relative time string.
 * No external dependencies.
 */
export function formatRelativeTime(timestampSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestampSeconds;

  if (diff < 0) {
    return "just now";
  }

  if (diff < 60) {
    return diff <= 1 ? "just now" : `${diff}s ago`;
  }

  const minutes = Math.floor(diff / 60);
  if (minutes < 60) {
    return minutes === 1 ? "1 min ago" : `${minutes} mins ago`;
  }

  const hours = Math.floor(diff / 3600);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.floor(diff / 86400);
  if (days < 30) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}
