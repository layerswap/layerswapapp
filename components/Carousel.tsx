import React, { forwardRef, ReactNode, useImperativeHandle, useState } from "react";
import { useSwipeable } from "react-swipeable";


interface CarouselItemProps {
    children?: JSX.Element | JSX.Element[];
    width: number;
}

export const CarouselItem: React.FC<CarouselItemProps> = ({ children, width }) => {
    return (
        <div className={`rounded-xl inline-flex items-center justify-center flex-col pb-0 bg-gradient-to-b from-darkblue-900 to-darkblue-700 h-full`} style={{ width: width }}>
            {children}
        </div>
    );
};

interface CarouselProps {
    children?: ReactNode;
    onLast: (value) => void;
}

export type CarouselRef = {
    next: () => void;
    hasNext: boolean;
};

const Carousel = forwardRef<CarouselRef, CarouselProps>((props, ref) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const children: any = props.children
    const updateIndex = (newIndex) => {
        props.onLast(false)
        if (newIndex >= 0 && newIndex <= React.Children.count(children) - 1) {
            setActiveIndex(newIndex);
        }
        if (newIndex >= React.Children.count(children) - 1)
            props.onLast(true)
    };

    useImperativeHandle(ref, () => ({
        next: () => {
            updateIndex(activeIndex + 1)
        },
        hasNext: activeIndex < React.Children.count(children) - 1

    }), [activeIndex]);

    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         if (!paused) {
    //             updateIndex(activeIndex + 1);
    //         }
    //     }, 3000);

    //     return () => {
    //         if (interval) {
    //             clearInterval(interval);
    //         }
    //     };
    // });

    const handlers = useSwipeable({
        onSwipedLeft: () => updateIndex(activeIndex + 1),
        onSwipedRight: () => updateIndex(activeIndex - 1),
    });


    return (
        <div
            {...handlers}
            className="overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div
                className="whitespace-nowrap transition-transform duration-500 inner"
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
                {children && React.Children.map(children, (child, index) => {
                    return React.cloneElement(child, { width: "100%" });
                })}
            </div>
            <div className="flex justify-center">
                {children && React.Children.map(children, (child, index) => {
                    return (
                        <button
                            className={`${index === activeIndex ? "bg-primary" : "bg-primary-text"} w-3 h-3 m-3 rounded-full`}
                            onClick={() => {
                                updateIndex(index);
                            }}
                        >
                        </button>
                    );
                })}

            </div>
        </div>
    );
});

export default Carousel;
