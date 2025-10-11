import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React, { FC } from 'react';

interface LinkWithIconProps {
    name: string;
    url: string;
}

const LinkWithIcon: FC<LinkWithIconProps> = ({ name, url }) => {
    return (
        <div className='underline hover:no-underline flex items-center space-x-1'>
            <Link target={"_blank"} href={url} rel="noopener noreferrer">
                {name}
            </Link>
            <ExternalLink className='h-4' />
        </div>
    );
};

export default LinkWithIcon;