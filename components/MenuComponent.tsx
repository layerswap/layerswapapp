import { Menu, Transition } from "@headlessui/react";
import { MenuIcon } from "@heroicons/react/outline";
import { FC, Fragment } from "react";
import { classNames } from "./utils/classNames";

interface MenuComponentProps {
    className?: string;
    menuVisible: boolean;
    children: JSX.Element | JSX.Element[]
}

const MenuComponent: FC<MenuComponentProps> = (({ className, menuVisible, children }) => {
    return (
        <Menu as="div" className={`relative inline-block text-left ${menuVisible ? 'visible' : 'invisible'}`}>
            <div>
                <Menu.Button className="inline-flex justify-center w-full rounded-md shadow-sm mt-2  text-sm font-medium">
                    <MenuIcon className='h-7 w-7 text-pink-primary-300 cursor-pointer' />
                </Menu.Button>
            </div>
            <span className="relative z-30 py-1">
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <Menu.Items className=" font-bold border border-darkblue-200 origin-top-right absolute right-0 mt-2 min-w-56 rounded-md shadow-lg bg-darkBlue ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="relative z-30 py-1">
                            {children}
                        </div>
                    </Menu.Items>
                </Transition>
            </span>
        </Menu>
    )
})

export default MenuComponent