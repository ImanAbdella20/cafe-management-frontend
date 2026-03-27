const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");

export function resolveMenuImageURL(imageURL: string): string {
    const trimmed = imageURL.trim();
    if (!trimmed) {
        return "";
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    if (trimmed.startsWith("/")) {
        return `${API_BASE_URL}${trimmed}`;
    }

    return `${API_BASE_URL}/${trimmed.replace(/^\/+/, "")}`;
}