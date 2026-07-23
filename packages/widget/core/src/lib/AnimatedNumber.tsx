import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

type AnimatedNumberProps = {
    value: number;
};

export const AnimatedNumber = ({ value }: AnimatedNumberProps) => {
    const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
    const display = useTransform(spring, (current) =>
        current?.toLocaleString()
    );

    useEffect(() => {
        spring.set(value);
    }, [value, spring]);

    return <motion.span>{display}</motion.span>;
};