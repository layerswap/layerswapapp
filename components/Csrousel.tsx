import React, { useEffect, useState } from "react";
import { useSwipeable } from "react-swipeable";


export const CarouselItem = ({ children, width }) => {
    return (
        <div className={`inline-flex items-center justify-center flex-col p-3 bg-darkblue-600 h-100%`} style={{ width: width }}>
            {children}
        </div>
    );
};

const Carousel = ({ children }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    const updateIndex = (newIndex) => {

        if (newIndex < 0) {
            newIndex = React.Children.count(children) - 1;
        } else if (newIndex >= React.Children.count(children)) {
            newIndex = 0;
        }
        
        setActiveIndex(newIndex);
    };

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
        onSwipedRight: () => updateIndex(activeIndex - 1)
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
                {React.Children.map(children, (child, index) => {
                    return React.cloneElement(child, { width: "100%" });
                })}
            </div>
            <div className="flex justify-center">

                {React.Children.map(children, (child, index) => {
                    return (
                        <button
                            className={`${index === activeIndex ? "bg-pink-primary" : "bg-pink-primary-300"} w-3 h-3 m-3 rounded-full`}
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
};

export default Carousel;
