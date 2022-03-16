import { Dispatch, FC, SetStateAction, useState } from 'react'
import { RadioGroup } from '@headlessui/react'

export interface NavRadioOption {
  name: string;
  displayName: string;
  isEnabled: boolean;
  isNew: boolean;
}

export interface NavRadioProps {
  selected: NavRadioOption,
  items: NavRadioOption[],
  setSelected: Dispatch<SetStateAction<NavRadioOption>>
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const NavRadio: FC<NavRadioProps> = ({ selected, items, setSelected }) => {
  return (
    <RadioGroup value={selected} onChange={setSelected} className="mt-2">
      <RadioGroup.Label className="sr-only">Choose a memory option</RadioGroup.Label>
      <div className="grid grid-cols-2 gap-2 p-0.5 rounded-md bg-gray-800 border-gray-600 border">
        {items.map((option) => (
          <RadioGroup.Option
            key={option.name}
            value={option}
            className={({ active, checked }) =>
              classNames(
                option.isEnabled ? 'cursor-pointer focus:outline-none' : 'opacity-25 cursor-not-allowed',
                checked
                  ? 'bg-gray-700 border-transparent text-white'
                  : 'bg-transparent border-transparent text-gray-400 hover:text-gray-200',
                'border rounded-md py-2 px-3 flex items-center justify-center text-sm font-medium sm:flex-1'
              )
            }
            disabled={!option.isEnabled}
          >
            <RadioGroup.Label as="div">
              <div>
                <p>{option.displayName}
                  {option.isNew && <span className='rounded-md ml-2 inline-block bg-pink-400 text-white text-xs py-0.5 px-1'>New</span>}
                </p>
              </div>
            </RadioGroup.Label>
          </RadioGroup.Option>
        ))}
      </div>
    </RadioGroup>
  )
}

export default NavRadio;