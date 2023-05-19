import Image from 'next/image'
import { FC } from 'react'
type Props = {
  imageUrls: string[]
}

const AvatarGroup: FC<Props> = (({ imageUrls }) => {
  return (
    <div className="">
      <div className="isolate flex -space-x-1 overflow-hidden p-1">
        {imageUrls.map(x => {
          return (
            <Image
              key={x}
              className="relative z-30 inline-block h-5 w-5 rounded-full ring-2 ring-secondary-600"
              src={x}
              width="60"
              height={60}
              alt=""
            />
          )
        })}
      </div>
    </div>
  )
});

export default AvatarGroup;