import { ExternalLink } from 'lucide-react';
import { FC } from 'react';

interface LinkWithIconProps {
    name: string;
    url: string;
    disabled?: boolean;
}

const LinkWithIcon: FC<LinkWithIconProps> = ({ name, url, disabled }) => {
    return (
        <span className="underline hover:no-underline inline-flex items-center gap-x-1">
            <a
                aria-disabled={disabled || undefined}
                target={disabled ? undefined : '_blank'}
                href={disabled ? undefined : url}
                rel="noopener noreferrer"
            >
                {name}
            </a>
            <ExternalLink className="h-4" />
        </span>
    );
};

export default LinkWithIcon;
