import { ExternalLink } from 'lucide-react';
import { FC } from 'react';

interface LinkWithIconProps {
    name: string;
    url: string;
}

const LinkWithIcon: FC<LinkWithIconProps> = ({ name, url }) => {
    return (
        <span className='underline hover:no-underline inline-flex items-center gap-x-1'>
            <a target={"_blank"} href={url} rel="noopener noreferrer">
                {name}
            </a>
            <ExternalLink className='h-4' />
        </span>
    );
};

export default LinkWithIcon;