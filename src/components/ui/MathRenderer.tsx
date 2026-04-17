
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MathRendererProps {
    content?: string | null;
    className?: string;
}

export function MathRenderer({ content, className }: MathRendererProps) {
    if (!content) return null;

    // Fix corrupted characters due to unescaped escape sequences (\f, \t, etc.)
    let normalized = content
        .replace(/\x0C/g, '\\f') // form feed to \f (recovers \frac)
        .replace(/\x09/g, '\\t') // tab to \t (recovers \times, \tan)
        .replace(/\x08/g, '\\b') // backspace to \b (recovers \beta)
        .replace(/\x0B/g, '\\v') // vertical tab to \v (recovers \vec)
        .replace(/\x0D/g, '\\r') // carriage return to \r (recovers \rightarrow)
        .replace(/\\\\\(/g, '\\(')
        .replace(/\\\\\)/g, '\\)')
        .replace(/\\\\\[/g, '\\[')
        .replace(/\\\\\]/g, '\\]')
        .replace(/\\n/g, '\n')
        // Fix cases where the slash was stripped entirely
        .replace(/\b(rac{)/g, '\\f$1')
        .replace(/\b(imes)\b/g, '\\t$1');

    // Regex to split math blocks and inline math
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\([\s\S]*?\\\))/;
    const parts = normalized.split(regex);

    // Helper to auto-detect pure math that forgot $ $ delimiters
    // It assumes a string is math if it has no Vietnamese letters and contains math operators
    const isLikelyMath = (str: string) => {
        const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/i.test(str);
        if (hasVietnamese) return false;
        
        const hasMathIndicators = /[\^_\=\+\-\*\/\\<>\{\}\[\]\|]|\b(sin|cos|tan|cot|lim|log|ln|sqrt|frac|times|div|cdot|pi|theta|alpha|beta)\b/i.test(str);
        return hasMathIndicators;
    };

    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (!part) return null;

                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const math = part.slice(2, -2);
                    return <BlockMath key={i} math={math} />;
                }
                if (part.startsWith('\\[') && part.endsWith('\\]')) {
                    const math = part.slice(2, -2);
                    return <BlockMath key={i} math={math} />;
                }
                if (part.startsWith('$') && part.endsWith('$')) {
                    const math = part.slice(1, -1);
                    return <InlineMath key={i} math={math} />;
                }
                if (part.startsWith('\\(') && part.endsWith('\\)')) {
                    const math = part.slice(2, -2);
                    return <InlineMath key={i} math={math} />;
                }

                // If this is a normal string, check if it's pure math without delimiters
                const trimmed = part.trim();
                // If it looks like a math formula and isn't just plain text
                if (trimmed && isLikelyMath(trimmed)) {
                    // Try to render it as math
                    try {
                        return <InlineMath key={i} math={trimmed} />;
                    } catch (e) {
                        // Fallback to normal text if Katex throws error
                        return <span key={i} className="whitespace-pre-wrap">{part}</span>;
                    }
                }

                return (
                    <span key={i} className="whitespace-pre-wrap">
                        {part}
                    </span>
                );
            })}
        </span>
    );
}
