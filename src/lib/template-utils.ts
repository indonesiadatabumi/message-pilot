/**
 * Extracts parameters (e.g., {{name}}) from template content.
 * @param content - The template string.
 * @returns An array of unique parameter names found in the content.
 */
export const extractParams = (content: string | undefined): string[] => {
    if (!content) return [];
    const regex = /\{\{\s*([^}]+?)\s*\}\}/g; // Matches {{ parameterName }}
    const params = new Set<string>();
    let match;
    while ((match = regex.exec(content)) !== null) {
        // Add the trimmed parameter name (e.g., "name") to the set
        params.add(match[1].trim());
    }
    return Array.from(params);
};
