import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React, { FC } from 'react';

interface LinkWithIconProps {
    name: string;
    url: string;
}

const LinkWithIcon: FC<LinkWithIconProps> = ({ name, url }) => {
    return (
        <span className='underline hover:no-underline inline-flex items-center gap-x-1'>
            <Link target={"_blank"} href={url} rel="noopener noreferrer">
                {name}
            </Link>
            <ExternalLink className='h-4' />
        </span>
    );
};

export default LinkWithIcon;