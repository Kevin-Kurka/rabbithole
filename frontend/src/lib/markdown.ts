
/**
 * Simple markdown to HTML converter (basic support)
 * Used for previews and read-only views
 */
export const renderMarkdown = (markdown: string) => {
    if (!markdown) return '<p class="text-muted-foreground italic">Nothing to preview</p>';

    let html = markdown;

    // Header 1
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>');

    // Header 2
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mt-8 mb-4">$1</h2>');

    // Header 3
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/gim, '<pre class="bg-muted p-4 rounded-md overflow-x-auto my-4"><code class="text-sm font-mono">$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/gim, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

    // Unordered lists
    html = html.replace(/^\* (.+)$/gim, '<li class="ml-6 list-disc">$1</li>');
    html = html.replace(/^- (.+)$/gim, '<li class="ml-6 list-disc">$1</li>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gim, '<li class="ml-6 list-decimal">$1</li>');

    // Paragraphs (split by double newline)
    const paragraphs = html.split('\n\n');
    html = paragraphs
        .map((p) => {
            // Don't wrap if already a block element or empty
            const trimmed = p.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<li')) {
                return trimmed;
            }
            return `<p class="mb-4 leading-relaxed">${trimmed.replace(/\n/g, '<br />')}</p>`;
        })
        .join('');

    return html;
};
