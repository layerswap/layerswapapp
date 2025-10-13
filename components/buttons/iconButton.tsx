import React, { ComponentProps, FC, forwardRef } from 'react'
import { classNames } from '../utils/classNames'

interface IconButtonProps extends Omit<ComponentProps<'button'>, 'color' | 'ref'> {
    icon?: React.ReactNode
}

const IconButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, IconButtonProps>(function IconButton({ className, icon, ...props }, ref) {
    const theirProps = props as object;

    return (
        <div className="fixed-width-container max-sm:bg-secondary-500 max-sm:rounded-lg max-sm:p-0.5">
            <button {...theirProps} type="button" className={classNames("active:animate-press-down py-1.5 justify-self-start text-secondary-text hover:bg-secondary-500 hover:text-primary-text focus:outline-hidden rounded-lg items-center", className)}>
                <div className='mx-1.5'>
                    <div>
                        {icon}
                    </div>
                </div>

                <span className="sr-only">Icon description</span>
            </button>
        </div>
    )
})

export default IconButton