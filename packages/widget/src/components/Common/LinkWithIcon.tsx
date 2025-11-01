import { ExternalLink } from 'lucide-react';
import React, { FC } from 'react';

interface LinkWithIconProps {
    name: string;
    url: string;
}

const LinkWithIcon: FC<LinkWithIconProps> = ({ name, url }) => {
    return (
        <div className='underline hover:no-underline flex items-center space-x-1'>
            <a target={"_blank"} href={url} rel="noopener noreferrer">
                {name}
            </a>
            <ExternalLink className='h-4' />
        </div>
    );
};

export default LinkWithIcon;