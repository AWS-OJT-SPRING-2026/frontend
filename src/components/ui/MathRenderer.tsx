
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MathRendererProps {
    content?: string | null;
    className?: string;
}

export function MathRenderer({ content, className }: MathRendererProps) {
    if (!content) return null;

    // Normalize escaped LaTeX strings from backend
    // Sometimes backend sends \\( instead of \(
    let normalized = content
        .replace(/\\\\\(/g, '\\(')
        .replace(/\\\\\)/g, '\\)')
        .replace(/\\\\\[/g, '\\[')
        .replace(/\\\\\]/g, '\\]')
        .replace(/\\n/g, '\n');

    // Mẫu regex để tìm tất cả các block toán học và inline
    // 1. $$ ... $$
    // 2. \[ ... \]
    // 3. $ ... $
    // 4. \( ... \)
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\([\s\S]*?\\\))/;
    
    // Tách chuỗi
    const parts = normalized.split(regex);

    return (
        <span className={className}>
            {parts.map((part, i) => {
                // BlockMath: $$ ... $$ hoặc \[ ... \]
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const math = part.slice(2, -2);
                    return <BlockMath key={i} math={math} />;
                }
                if (part.startsWith('\\[') && part.endsWith('\\]')) {
                    const math = part.slice(2, -2);
                    return <BlockMath key={i} math={math} />;
                }
                
                // InlineMath: $ ... $ hoặc \( ... \)
                if (part.startsWith('$') && part.endsWith('$')) {
                    const math = part.slice(1, -1);
                    return <InlineMath key={i} math={math} />;
                }
                if (part.startsWith('\\(') && part.endsWith('\\)')) {
                    const math = part.slice(2, -2);
                    return <InlineMath key={i} math={math} />;
                }

                // Normal String with multiline support
                if (part) {
                    return (
                        <span key={i} className="whitespace-pre-wrap">
                            {part}
                        </span>
                    );
                }
                return null;
            })}
        </span>
    );
}
